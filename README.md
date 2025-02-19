#  Movie Ticket Booking System 
_A full-stack web application built with Node.js, Express, MongoDB, and EJS._

##  Features
-  **Authentication**: Users can sign up, log in, and reset passwords using bcrypt.  
-  **Movie Management** (Admin): Admins can add, update, and delete movies, set and manage movies description or pricing.  
-  **Booking System**: Users can search for movies from title, language or genre of movie and book tickets. 
-  **Cart**: Users will be able to add or delete movies in cart and book them in future.  
-  **Payment Integration**: Users will be able to make online payments securely to book ticket.  
-  **Payment Integration**: Invoice is generated after each successfull payment.  
-  **User Dashboard**: View past bookings in the form of invoice.  
-  **User Dashboard**: Also admin contains all features of user also like search, booking ticket, etc.  
-  **Upcoming Features**:  
  - Dynamic Seat Selection  
  - Manage Theaters  

---

##  Tech Stack
| Technology  | Usage |
|-------------|--------|
| **Node.js**  | Backend server |
| **Express.js**  | Web framework |
| **MongoDB**  | Database |
| **EJS**  | Templating engine |
| **bcrypt**  | Password hashing |
| **Multer**  | Image uploads |

---

##  How It Works?
1️⃣ **User Authentication**  
- Users and admins must sign up/log in to access the platform.  
- Passwords are securely hashed using bcrypt.  
- During sign up you have an option to choose role between user and admin.  

2️⃣ **Admin Dashboard**  
- Admins can add movies with details like title, description, genre, duration, and price.  
- Admins can edit/delete movie listings.  

3️⃣ **Movie Browsing & Booking**  
- Users can search movies by title, genre, or language.  
- Users select movies, confirm booking, make a payment and receive a confirmation in form of invoice.  

4️⃣ **Forgot/Reset Password**  
- User or admin both can reset their password.  
- Link is sent on their e-mail to get new password.  

---

## View Website
 click on this link: https://movie-ticket-booking-system-d1in.onrender.com/