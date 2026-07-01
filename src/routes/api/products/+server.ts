// src/routes/api/products/+server.ts
//
// Mock of the WooCommerce REST API products endpoint.
// It serves data shaped like the real /wp-json/wc/v3/products response, so that
// when Filip provides the live API key, only the fetch URL in the catalogue
// loader needs to change — the data shape stays the same.
//
// Once this file is in place, the data is available in the browser at:
//   http://localhost:5173/api/products

import { json } from '@sveltejs/kit';
import products from '$lib/data/products.json';

export function GET() {
  return json(products);
}
