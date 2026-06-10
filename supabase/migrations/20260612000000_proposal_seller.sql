-- Seller (the user's business name) shown on the PDF masthead and footer.
alter table public.proposals add column if not exists seller_name text;
