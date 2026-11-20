-- Repair installations where 00084 has already been applied.
CREATE OR REPLACE FUNCTION public.deliver_calendar_portal_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid UUID; typ TEXT; mon TEXT; iid UUID; parent_user UUID; actor TEXT;
  recipient RECORD; mentioned BOOLEAN; name_pattern TEXT; email_pattern TEXT;
BEGIN
  IF TG_TABLE_NAME = 'calendar_comments' THEN
    cid := NEW.client_id; typ := NEW.calendar_type; mon := NEW.month;
    IF NEW.parent_id IS NOT NULL THEN
      SELECT user_id INTO parent_user FROM calendar_comments WHERE id = NEW.parent_id AND client_id = cid AND calendar_type = typ AND month = mon;
    END IF;
  ELSE
    iid := NEW.idea_id;
    IF TG_TABLE_NAME = 'ads_comments' THEN
      typ := 'ads';
      SELECT client_id, to_char(publish_date, 'YYYY-MM') INTO cid, mon FROM ads_ideas WHERE id = iid;
      SELECT user_id INTO parent_user FROM ads_comments WHERE id = NEW.parent_id AND idea_id = iid;
    ELSE
      typ := 'social';
      SELECT client_id, to_char(publish_date, 'YYYY-MM') INTO cid, mon FROM social_ideas WHERE id = iid;
      SELECT user_id INTO parent_user FROM social_comments WHERE id = NEW.parent_id AND idea_id = iid;
    END IF;
  END IF;
  IF cid IS NULL OR mon IS NULL THEN RETURN NEW; END IF;
  SELECT coalesce(nullif(full_name, ''), 'Equipo') INTO actor FROM users WHERE id = NEW.user_id;
  FOR recipient IN
    SELECT u.id, u.full_name, u.email FROM users u
    WHERE u.app_id = 'nexus' AND u.role = 'client' AND u.id IS DISTINCT FROM NEW.user_id AND (
      u.client_id = cid OR cid::TEXT = ANY(coalesce(u.allowed_client_ids, '{}')) OR
      EXISTS (SELECT 1 FROM calendar_client_portals p WHERE p.client_id = cid AND p.enabled AND p.guest_enabled AND u.id = ANY(p.allowed_user_ids)) OR
      EXISTS (SELECT 1 FROM calendar_share_links l WHERE l.client_id = cid AND l.month = mon AND (l.calendar_type = typ OR l.calendar_type = 'social') AND l.enabled AND l.guest_enabled AND (u.id = ANY(l.allowed_user_ids) OR u.client_id = l.allowed_client_id OR l.allowed_client_id::TEXT = ANY(coalesce(u.allowed_client_ids, '{}'))))
    )
  LOOP
    name_pattern := regexp_replace(trim(coalesce(recipient.full_name, '')), '([.\\+*?\[\](){}^$|])', '\\\1', 'g');
    email_pattern := regexp_replace(split_part(coalesce(recipient.email, ''), '@', 1), '([.\\+*?\[\](){}^$|])', '\\\1', 'g');
    mentioned := (length(name_pattern) >= 2 AND NEW.content ~* ('@' || name_pattern || '([^[:alnum:]_]|$)')) OR
      (length(email_pattern) >= 2 AND NEW.content ~* ('@' || email_pattern || '([^[:alnum:]_]|$)'));
    IF mentioned OR recipient.id = parent_user THEN
      INSERT INTO calendar_portal_notifications(client_id, user_id, calendar_type, month, idea_id, comment_id, kind, content, actor_name)
      VALUES (cid, recipient.id, typ, mon, iid, NEW.id, CASE WHEN mentioned THEN 'mention' ELSE 'reply' END, left(NEW.content, 500), coalesce(actor, 'Equipo'));
    END IF;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Only notification work is rolled back; the original comment is preserved.
  RAISE WARNING 'Calendar portal notification delivery failed (SQLSTATE %)', SQLSTATE;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.deliver_calendar_portal_comment() FROM PUBLIC;
