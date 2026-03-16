# Delivery Workspace Screen — Content & UI Specification (English)

This document describes every visible element on the **Delivery (Driver) Workspace** screen: buttons, titles, cards, and all content. Use it as a reference for copy, UX, or implementation.

---

## 1. Screen identity

- **Screen name / title:** Driver Workspace  
- **Role:** Delivery / Livreur only (non-delivery users are redirected).  
- **Layout:** Full-screen map in the background; overlay UI (header, search, controls, bottom sheet). Map can go fullscreen; normal UI can fade out.

---

## 2. Header

- **Left:** Driver avatar (circular image). If no photo: placeholder with **person** icon.  
- **Center (title):** **"Driver Workspace"**  
- **Right:** Spacer (no icon/button).  
- **Style:** White/semi-transparent bar, bottom border. Positioned with safe area.

---

## 3. Search bar

- **Icon:** Search (magnifying glass), left side.  
- **Placeholder text:** **"Search delivery location"**  
- **Behavior:** Text input; value is stored (`searchQuery`). No backend search wired in the current spec.  
- **Position:** Directly under the header.

---

## 4. Map controls (floating, over the map)

- **Zoom card (two buttons):**  
  - **Plus (+)** — zoom in.  
  - **Minus (−)** — zoom out.  
- **“Near me” button:** Single button with **near-me** (location) icon — re-center map on driver’s location.  
- **Position:** Typically right side of the screen, stacked vertically.

---

## 5. Back button

- **Icon:** Arrow back (chevron left).  
- **Action:** Navigate back (e.g. previous screen).  
- **Position:** Top-left over the map/header area (e.g. `headerTop + 4`).

---

## 6. Fullscreen map controls

- **Expand (enter fullscreen):** Button with **fullscreen** icon; first tap enters fullscreen map.  
- **Exit fullscreen:** **fullscreen-exit** icon; exits fullscreen.  
- **Back in fullscreen:** Arrow back; navigates back.  
- **Position:** Over the map when in fullscreen overlay.

---

## 7. Bottom sheet — drag handle

- **Visual:** Short horizontal pill/bar at the top of the sheet (drag handle).  
- **Behavior:** User can drag the sheet up/down to expand/collapse (e.g. half height vs full height).  
- **Style:** Small rounded bar, subtle color.

---

## 8. Bottom sheet — tabs (horizontal, scrollable)

Tabs are in a **horizontal ScrollView** (scroll X if needed). Each tab has an icon + label.

| Tab key    | Tab label (title) | Icon (MaterialIcons) |
|-----------|--------------------|----------------------|
| Available | **Available**      | inbox                |
| Accepted  | **Accepted**       | check-circle         |
| Estimated | **Estimated**      | schedule             |
| Historic  | **Historic**       | history              |

- **Behavior:** One active tab; active state uses primary color and bottom border. Inactive: muted color.  
- **Content:** Each tab shows a list of order cards (or loading). Tab content is described in the “Order cards” section below.

---

## 9. Loading state (inside bottom sheet)

When the active tab is loading:

- **Spinner:** Small activity indicator (primary color).  
- **Text:** **"Loading available requests..."**  
- **Note:** Same message is used for all tabs (Available, Accepted, Estimated, Historic). Copy could be made tab-specific later (e.g. “Loading accepted…”, “Loading history…”).

---

## 10. Order cards (list inside bottom sheet)

Each item in the list is an **order card**. Tapping the card selects it for the map (highlights card and shows delivery/pickup on map). Card content:

### 10.1 Top row — client & price

- **Left:**  
  - Client avatar (photo or placeholder with **person** icon).  
  - **Client name** (e.g. “John”).  
  - **Rating** (star icon + value, e.g. “4.2”) and **tag** (e.g. city or label), in one line: **"rating • tag"**.  
- **Right:**  
  - **Price** (delivery fee / estimation price, formatted).  
  - **Distance** (e.g. “2.3 km away” or “—” if no location).

### 10.2 Product thumbnails (optional)

- Up to **4 small thumbnails** (product images) in a row.  
- If no images, this row is hidden.

### 10.3 Patissiere & delivery row

- **Patissiere:** Small avatar (photo or **store** icon) + text **"From: {patissiereName}"**.  
- **Delivery (you):** Small chip with delivery avatar (photo or **local-shipping** icon) + **delivery name** (current driver).

### 10.4 Payment status row

- **If paid:** Green style — check-circle icon + text **"Paid"**.  
- **If not paid:** Amber/orange style — schedule icon + text **"Not paid yet"**.  
- This refers to the **delivery fee** payment by the client, not the order total.

### 10.5 Card actions row

- **“View order” button:**  
  - Label: **"View order"**  
  - Icon: chevron-right.  
  - Action: Navigate to delivery order detail screen for this order.  
- **Done:**  
  - If order status is **delivered:**  
    - **Done badge** (non-clickable): check-circle icon + text **"Done"** (green).  
  - Else:  
    - **Done button** (clickable): check-circle icon + text **"Done"**.  
    - Action: Confirm delivery (mark order as delivered) and refresh lists.

---

## 11. Map content (when an order is selected)

- **Markers:**  
  - **Delivery** — client delivery address.  
  - **Pickup** — patissiere address.  
- **Driver location:** Shown on map (e.g. from GPS).  
- Selecting another card or the same card again can clear the selection (toggle).

---

## 12. Tab content meaning (what each tab shows)

- **Available:** Pending **client** delivery requests (no delivery accepted yet). Driver can accept and send estimate.  
- **Accepted:** Estimations **accepted by this driver** and not yet delivered (order not in “delivered” status).  
- **Estimated:** This driver has sent an **estimate** that is not yet confirmed (e.g. waiting for client).  
- **Historic:** Orders **already delivered** by this driver (status = delivered). Read-only list; “View order” and “Done” badge only.

---

## 13. Empty states

- No explicit empty-state copy is defined in the current implementation (e.g. “No available requests”). If the list is empty, the user just sees no cards. You may add messages like “No requests in Available” / “No history yet” per tab.

---

## 14. Summary — buttons and titles quick reference

| Element              | Title / label              | Icon / type        |
|----------------------|----------------------------|---------------------|
| Screen title         | Driver Workspace           | —                   |
| Search placeholder   | Search delivery location   | search              |
| Tab 1                | Available                  | inbox               |
| Tab 2                | Accepted                   | check-circle        |
| Tab 3                | Estimated                  | schedule            |
| Tab 4                | Historic                   | history             |
| Loading text         | Loading available requests…| spinner             |
| Card: view           | View order                 | chevron-right       |
| Card: done           | Done                       | check-circle        |
| Payment paid         | Paid                       | check-circle        |
| Payment not paid     | Not paid yet               | schedule            |
| Patissiere prefix    | From:                      | store (if no photo) |
| Zoom                 | —                          | + / −               |
| Re-center map        | —                          | near-me             |
| Back                 | —                          | arrow-back          |
| Fullscreen           | —                          | fullscreen / fullscreen-exit |

This spec covers the full delivery workspace screen content in English for copy, UX, and implementation consistency.
