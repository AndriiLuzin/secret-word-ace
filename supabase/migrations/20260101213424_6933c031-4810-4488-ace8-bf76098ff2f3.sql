-- Allow deleting whoami player views for new rounds
CREATE POLICY "Anyone can delete whoami player views"
ON public.whoami_player_views
FOR DELETE
USING (true);