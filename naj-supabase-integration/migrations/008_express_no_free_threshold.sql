-- Free shipping over $400 applies to standard US delivery only, not express
UPDATE shipping_rates
SET free_threshold = NULL
WHERE zone = 'usa'
  AND method = 'express';
