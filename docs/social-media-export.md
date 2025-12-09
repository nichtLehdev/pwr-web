# Social Media Export Feature

## Overview

This feature allows administrators to generate Instagram-ready post images (1080x1080px) for events directly from the dashboard.

## Location

Dashboard → Events → "Instagram Posts" button (top right, next to "Neuer Termin")

## Features

### 1. Monthly Summary Image

- Shows all events for a selected month
- Displays up to 8 events with additional count if more
- Includes Posaunenwerk branding and logo
- 1:1 aspect ratio (1080x1080px) perfect for Instagram posts

### 2. Individual Event Cards

- One image per event in the selected month
- Includes:
  - Event title, date, and time
  - Location details
  - Event category badge
  - District branding (color-coded)
  - Cover image (if available)
  - Motto (if set)
- Fully branded with consistent styling

### 3. Export Options

- **Download Summary**: Download just the monthly overview
- **Download Individual Event**: Download a single event card
- **Download All as ZIP**: Download summary + all event cards in one ZIP file

## Usage

1. Navigate to `/dashboard/events`
2. Click the "Instagram Posts" button
3. Select the desired month and year
4. Preview the generated images
5. Download individual images or all as ZIP

## Technical Details

### Dependencies

- `html-to-image`: Converts React components to PNG images
- `jszip`: Creates downloadable ZIP archives

### Components

- `SocialMediaExportModal`: Main modal component with month selector
- `InstagramSummaryTemplate`: Template for monthly summary
- `InstagramEventTemplate`: Template for individual event cards

### API Endpoint

- `events.getEventsByMonth`: Fetches approved events for a specific month

### File Naming Convention

- Summary: `termine-[Monat]-[Jahr].png`
- Events: `[Tag]-[event-title-slug].png`
- ZIP: `instagram-posts-[Monat]-[Jahr].zip`

## Styling

All images use consistent branding:

- Primary color: `#faa619` (orange)
- District-specific colors for event cards
- Posaunenwerk logo
- Inter font family
- Responsive text sizes optimized for 1080x1080px
