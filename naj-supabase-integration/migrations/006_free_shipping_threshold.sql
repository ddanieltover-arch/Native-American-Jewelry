-- Raise US free-shipping threshold to $400
UPDATE shipping_rates
SET free_threshold = 400.00
WHERE zone = 'usa'
  AND method = 'standard'
  AND (free_threshold IS NULL OR free_threshold < 400);
