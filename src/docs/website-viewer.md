---
title: Website Viewer
---

# Website Viewer

The **Website Viewer** allows users and visitors to view published websites created with Webnest. It supports both automatic and custom URLs, and provides a user-friendly interface for accessing live sites.

## Features

- **View Published Websites**: Access any published website by its unique ID or custom path.
- **Custom & Automatic URLs**: Supports both system-generated and user-defined URLs for websites.
- **Error Handling**: Displays a friendly error page if the website is not found or not published.
- **Responsive Design**: Optimized for all devices.
- **Call to Action**: Encourages users to create their own website if the requested one does not exist.
- **Feature Highlights**: Showcases Webnest's main features (drag & drop, templates, instant publishing) on the not-found page.
- **Pricing Info**: Displays pricing for classic and custom domain publishing.

## How It Works

1. **URL Access**: Users can access a website via `/view/:id` or a custom path.
2. **Website Lookup**: The viewer first tries to find the website by custom path, then by direct ID.
3. **Content Rendering**: If found and published, the website's HTML is decoded and rendered.
4. **Error States**: If not found or unpublished, a helpful error page is shown with options to create a new site.

## UI Elements

- **Loading State**: Spinner and loading message while fetching the website.
- **Not Found Page**: Includes:
  - Website not found message
  - Call-to-action to create a new website
  - Feature grid (easy to use, professional templates, instant online)
  - Pricing section (classic vs. custom domain)
  - Success badge and CTA button

## Example

If a user visits a non-existent website URL, they see a page with:
- A message that the website does not exist
- A button to create their own website
- Highlights of Webnest's features and pricing

---

For more on publishing and custom domains, see the [Templates](./templates.md) and [Payment & Tokens](./payment-tokens.md) docs. 