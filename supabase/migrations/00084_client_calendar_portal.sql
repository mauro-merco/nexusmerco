-- Explicitly enabled client-wide access; existing monthly tokens are unchanged.
CREATE TABLE public.calendar_client_portals (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  allowed_client_id UUID NOT NULL REFERENCES public.clients(id) CHECK (allowed_client_id = client_id),
  allowed_user_ids UUID[] NOT NULL DEFAULT '{}',
  guest_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_client_portals ENABLE ROW LEVEL SECURITY;
-- Configuration and delivery are service-role only. Public routes verify sessions.
CREATE TABLE public.calendar_portal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  calendar_type TEXT NOT NULL CHECK (calendar_type IN ('social', 'ads')),
  month TEXT NOT NULL,
  idea_id UUID,
  comment_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('mention', 'reply')),
  content TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.calendar_portal_notifications(user_id, client_id, created_at DESC);
ALTER TABLE public.calendar_portal_notifications ENABLE ROW LEVEL SECURITY;

-- All comment entry points (dashboard and shared calendar) deliver the same feed.
CREATE FUNCTION public.deliver_calendar_portal_comment() RETURNS trigger
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
  -- Notification delivery must never roll back the original comment.
  RAISE WARNING 'Calendar portal notification delivery failed (SQLSTATE %)', SQLSTATE;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.deliver_calendar_portal_comment() FROM PUBLIC;
CREATE TRIGGER calendar_portal_comment AFTER INSERT ON public.calendar_comments FOR EACH ROW EXECUTE FUNCTION public.deliver_calendar_portal_comment();
CREATE TRIGGER social_portal_comment AFTER INSERT ON public.social_comments FOR EACH ROW EXECUTE FUNCTION public.deliver_calendar_portal_comment();
CREATE TRIGGER ads_portal_comment AFTER INSERT ON public.ads_comments FOR EACH ROW EXECUTE FUNCTION public.deliver_calendar_portal_comment();
