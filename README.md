# Jobportal - A Comprehensive Job Portal Web Application

## 📖 Introduction
**Jobportal** is a full-stack web application designed to bridge the gap between job seekers, employers, and administrators.  
It provides a robust, secure, and user-friendly platform for managing job postings, applications, and user accounts.

The application is built with:
- **Back-End:** Python Flask
- **Database:** MySQL
- **Front-End:**  JavaScript +  CSS  

It features a sophisticated **three-tier user role system**:
- **Job Seeker**
- **Employer**
- **Admin**  

Each role comes with distinct permissions and dashboards.

---

## ✨ Key Features

### 🔑 General Features
- **User Authentication:** Secure registration & login system using JWT (JSON Web Tokens) for stateless authentication.
- **Dynamic Front-End:** Built with  JS +  CSS for fast, responsive, and seamless navigation.
- **Intelligent Footer:** Footer links dynamically adapt based on user login status and role.
- **Static Pages:** Includes "About Us," "Contact Us," "Privacy Policy," and "Terms of Service."

---

### 👤 Job Seeker Features
- **Profile Management:** Create/edit a detailed profile including personal details, education, skills, preferred roles, and location.
- **Advanced Job Search:** Search jobs by keywords (title, company, skills) **and** location simultaneously.
- **Personalized Job Sorting:** Prioritizes job roles that match a job seeker's profile preferences.
- **Application System:** Easy job application with a simple form + PDF resume upload.
- **Dashboard:** View the status of all submitted applications.

---

### 🏢 Employer Features
- **Company Profile:** Create and manage a company profile.
- **Job Posting:** Create new job postings (sent to admin for approval).
- **Dashboard:** View all job posts with status (Pending, Approved, Rejected).
- **Applicant Viewing:** See candidate profiles, application details, and resumes.
- **In-App Resume Viewer:** View resumes directly in-app without browser toolbars.

---

### 🛡️ Admin Features
- **Admin Dashboard:** Central control panel for the entire application.
- **Job Approval Queue:** Approve or reject pending job posts.
- **User Management:** View all registered users (Job Seekers, Employers, Admins).
- **Admin Approval Queue:** New admins must be approved by an existing admin before logging in.
- **User Deletion:** Securely delete any user (except yourself).
- **Full Applicant Viewing:** View applicants for any job with the same detailed view as employers.

---

## 🛠️ Technology Stack
- **Back-End:** Python, Flask, Flask-JWT-Extended, Flask-MySQLdb, Flask-Mail  
- **Front-End:** HTML, CSS, JavaScript  
- **Database:** MySQL  
- **Authentication:** JWT  
- **Email:** Flask-Mail (SMTP e.g., Gmail)

---

## 🚀 Project Setup & Installation

Follow these steps to set up and run the project locally.

### 1️⃣ Prerequisites
- Python 3.x  
- MySQL server installed and running  
- A virtual environment tool (`venv`)  

---

### 2️⃣ Clone the Repository
```bash
git clone <your-repository-url>
cd job-portal-project

# 3. Set Up the Environment

# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
.\venv\Scripts\activate


# 4. Install Dependencies
pip install -r requirements.txt


# 5. Database Setup
 1. Open your MySQL client (e.g., MySQL Workbench)
 2. Create a new database with the name specified in config.py (default: job_portal_db1)
 3. Execute the schema.sql file to create all necessary tables


# 6. Configure Environment Variables

# For macOS/Linux:
export SECRET_KEY='your-own-secret-key'
export MYSQL_PASSWORD='your_database_password'
export MAIL_USERNAME='your-app-email@gmail.com'
export MAIL_PASSWORD='your-email-app-password'

# For Windows (Command Prompt):
set SECRET_KEY="your-own-secret-key"
set MYSQL_PASSWORD="your_database_password"
set MAIL_USERNAME="your-app-email@gmail.com"
set MAIL_PASSWORD="your-email-app-password"

# Note: MAIL_PASSWORD should be a Google App Password or your direct password
# if you have enabled "Less Secure App Access."


# 7. Run the Application
python run.py

# The application will be available at:
# http://127.0.0.1:5000
