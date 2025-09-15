const API_BASE_URL = 'http://127.0.0.1:5000';

const parseJwt = (token) => {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
};

const setupSharedComponents = () => {
    const navButtons = document.getElementById('nav-buttons');
    const footerContainer = document.getElementById('footer-container');
    const token = localStorage.getItem('jwtToken');
    const user = token ? parseJwt(token) : null;


    if (user) {
        let dashboardUrl = '/';
        if (user.user_type === 1) dashboardUrl = '/admin_dashboard';
        if (user.user_type === 2) dashboardUrl = '/employer_dashboard';
        if (user.user_type === 3) dashboardUrl = '/job_seeker_dashboard';

        navButtons.innerHTML = `
            <a href="/" class="nav-link">Home</a>
            <a href="${dashboardUrl}" class="nav-link">Dashboard</a>
            <button id="nav-logout-btn" class="button button-primary">Log Out</button>
        `;
        document.getElementById('nav-logout-btn').addEventListener('click', () => {
            localStorage.removeItem('jwtToken');
            window.location.href = '/';
        });
    } else {
        navButtons.innerHTML = `
            <button id="nav-login-btn" class="button button-secondary">Log In</button>
            <button id="nav-register-btn" class="button button-primary">Register</button>
        `;
    }


    footerContainer.innerHTML = `
        <div class="container">
            <div class="footer-grid">
                <div class="footer-column">
                    <h4 class="footer-heading">For Job Seekers</h4>
                    <ul>
                        <li><a href="/">Search Jobs</a></li>
                        <li><a id="footer-create-profile-link" href="#">Create Profile</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h4 class="footer-heading">For Employers</h4>
                    <ul>
                        <li><a id="footer-post-job-link" href="#">Post a Job</a></li>
                        <li><a id="footer-employer-login-link" href="#">Employer Login</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h4 class="footer-heading">Company</h4>
                    <ul>
                        <li><a href="/about">About Us</a></li>
                        <li><a href="/contact">Contact Us</a></li>
                    </ul>
                </div>
                <div class="footer-column">
                    <h4 class="footer-heading">Stay Connected</h4>
                    <div class="social-links">
                        <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-instagram"></i></a>
                        <a href="https://x.com" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-xing"></i></a>
                    </div>
                </div>
            </div>
            <hr class="footer-divider">
            <div class="footer-bottom">
               <p>&copy; ${new Date().getFullYear()} JobFinder. All Rights Reserved.</p>
               <ul class="footer-legal-links">
                   <li><a href="/privacy">Privacy Policy</a></li>
                   <li><a href="/terms">Terms of Service</a></li>
               </ul>
            </div>
        </div>`;


    const postJobLink = document.getElementById('footer-post-job-link');
    const createProfileLink = document.getElementById('footer-create-profile-link');
    const employerLoginLink = document.getElementById('footer-employer-login-link');

    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');

    const openLogin = (e) => {
        e.preventDefault();
        if(loginModal) {
            loginModal.classList.remove('hidden');
        } else {
            window.location.href = '/';
        }
    };
    const openRegister = (e) => {
        e.preventDefault();
        if(registerModal) {
            registerModal.classList.remove('hidden');
        } else {
            window.location.href = '/';
        }
    };

    if (user) {
        if (user.user_type === 3) {
            postJobLink.style.opacity = '0.5';
            postJobLink.style.cursor = 'not-allowed';
            postJobLink.onclick = (e) => { e.preventDefault(); alert('Only employers can post jobs.'); };
        } else {
            postJobLink.href = user.user_type === 1 ? '/admin_dashboard' : '/employer_dashboard';
        }
        createProfileLink.href = '/job_seeker_dashboard';
        employerLoginLink.href = user.user_type === 2 ? '/employer_dashboard' : '/';}
         else {
        postJobLink.onclick = openLogin;
        createProfileLink.onclick = openRegister;
        employerLoginLink.onclick = openLogin;

        const navLoginBtn = document.getElementById('nav-login-btn');
        const navRegisterBtn = document.getElementById('nav-register-btn');
        if (navLoginBtn) navLoginBtn.onclick = openLogin;
        if (navRegisterBtn) navRegisterBtn.onclick = openRegister;
    }
};

