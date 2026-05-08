# Craftique Project: Comprehensive Codebase Documentation & Q&A

This document is designed to help you prepare for your project discussion. It explains the entire architecture of the Craftique platform and provides a Q&A section with concise answers to potential questions your professor might ask.

---

## Part 1: Architecture Overview

Craftique is built using a modern **Monolithic API Architecture** with a decoupled frontend and backend.
* **Frontend:** Built with **React.js** (via Vite), utilizing Tailwind CSS for styling and React Router for navigation.
* **Backend:** Built with **Laravel 11** (PHP), utilizing SQLite for the database and Laravel Sanctum for API token authentication.

### Frontend Structure (React)
The frontend uses the **Context API** for global state management to avoid "prop drilling" (passing data down through many layers of components).

1. **AuthContext (`src/context/AuthContext.jsx`):** 
   - Manages the user's login state, JWT token, and their role (`buyer`, `seller`, or `admin`). 
   - It stores the token in `localStorage` so the user remains logged in after refreshing the page.
2. **CartContext (`src/context/CartContext.jsx`):** 
   - Manages the shopping cart state. It stores cart items in `localStorage` so users don't lose their cart items if they close the tab.
3. **Routing (`src/App.jsx`):** 
   - Uses `react-router-dom` to map URLs to specific page components.
   - Uses a custom `<PrivateRoute>` wrapper to protect routes. For example, it checks `requireAdmin=true` to block non-admins from viewing the `admin/` routes.
4. **Pages:**
   - **Storefront:** `Home`, `ProductDetail`, `Cart`, `Checkout`.
   - **Admin Panel:** `Dashboard` (Analytics), `Orders`, `Products` (Moderation), `Customers`.
   - **Seller Portal:** `SellerDashboard` (Inventory management), `SellerLogin`.

### Backend Structure (Laravel)
The backend follows the **MVC (Model-View-Controller)** design pattern. Since this is an API, the "View" is simply JSON responses sent back to React.

1. **Models (Database Tables):**
   - **User, Admin, Seller:** Different entity types for users.
   - **Product:** Belongs to a Seller. Has a `status` (`pending`, `approved`, `rejected`).
   - **Order & OrderItem:** Tracks purchases. `OrderItem` links to `Product` and `Seller`.
2. **Controllers:**
   - **AuthController & SellerAuthController:** Handles registration and login, generating Sanctum API tokens.
   - **ProductController:** Fetches approved products for the public storefront.
   - **SellerProductController:** Allows sellers to perform CRUD operations on their own products.
   - **AdminController:** Provides endpoints for analytics and moderation (approving/rejecting products, updating order statuses).
   - **CheckoutController:** Handles order creation using Database Transactions to ensure data integrity.
3. **Routing (`routes/api.php`):**
   - Routes are grouped by functionality. Protected routes are wrapped in the `auth:sanctum` middleware, meaning the React app must send a valid `Bearer Token` in the Authorization header.

---

## Part 2: Professor Q&A Prep

Here is a list of questions your professor might ask to test your understanding of the code, along with concise answers.

> [!IMPORTANT]
> When answering, use confident terminology. Emphasize keywords like **API**, **Context**, **State**, **Middleware**, and **Transactions**.

### General Architecture
**Q: Why did you choose React and Laravel instead of standard PHP/Blade?**
**A:** We chose a decoupled architecture to create a single-page application (SPA). React provides a seamless, fast user experience without page reloads, while Laravel serves as a robust API back-end handling complex database relationships and security.

**Q: How do the frontend and backend communicate?**
**A:** They communicate via RESTful API calls using the `axios` library in React. The frontend sends HTTP requests (GET, POST, PUT, DELETE) and the backend responds with JSON data.

### Authentication & Security
**Q: How is authentication handled in this project?**
**A:** We use **Laravel Sanctum** for token-based authentication. When a user logs in, Laravel generates an API token. React stores this token in `localStorage` and attaches it as a "Bearer Token" in the header of all subsequent Axios requests.

**Q: How do you prevent a normal user from accessing the Admin dashboard?**
**A:** We handle this on both ends. On the frontend, we use a `PrivateRoute` component that checks the user's `role` stored in `AuthContext` and redirects unauthorized users. On the backend, data is protected because the API endpoints verify the user's identity via the Sanctum middleware.

**Q: Are passwords stored securely?**
**A:** Yes, passwords are never stored in plain text. Laravel automatically hashes them using the Bcrypt hashing algorithm before storing them in the database.

### State Management & Frontend Logic
**Q: How does the shopping cart remember items after a page refresh?**
**A:** We implemented a `CartContext` in React. Whenever an item is added or removed, a `useEffect` hook triggers and stringifies the cart array, saving it to the browser's `localStorage`. When the app loads, it initializes the state by parsing that `localStorage` data.

**Q: What is a `useEffect` hook used for in your application?**
**A:** `useEffect` is used for side effects. For example, in our `Dashboard.jsx`, we use an empty dependency array `[]` in a `useEffect` to make an Axios `GET` request to fetch data the moment the component mounts on the screen.

### Backend Logic & Database
**Q: How do you handle the checkout process to ensure data isn't corrupted if something fails?**
**A:** In the `CheckoutController`, we use **Database Transactions** (`DB::beginTransaction()`). If an error occurs while saving the Order or the OrderItems, or while deducting the product stock, we trigger a `DB::rollBack()` to cancel the entire operation. This prevents half-completed orders from saving.

**Q: Explain the product approval workflow you built.**
**A:** We added a `status` column to the `products` table (`pending`, `approved`, `rejected`). When a seller creates a product, it defaults to `pending`. The public `ProductController` is filtered to only return `approved` products. An admin uses the `AdminController` to change the status, making it visible to the public.

**Q: How do you ensure sellers can only delete their own products?**
**A:** In the `SellerProductController`'s `destroy` method, we fetch the product and compare its `seller_id` to the currently authenticated user's ID (`$request->user()->id`). If they don't match, we return a 403 Unauthorized HTTP response.

**Q: What is Eloquent and how did you use it?**
**A:** Eloquent is Laravel's Object-Relational Mapper (ORM). We used it to define relationships between database tables. For example, in the `Order` model, we defined an `items()` method that returns `$this->hasMany(OrderItem::class)`. This allows us to easily fetch an order and all its items using `Order::with('items')`.
