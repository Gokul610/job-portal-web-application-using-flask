document.addEventListener('DOMContentLoaded', () => {

    const navButtons = document.getElementById('nav-buttons');
    const applicationsContainer = document.getElementById('applications-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const editProfileForm = document.getElementById('edit-profile-form');
    const changePasswordForm = document.getElementById('change-password-form');
    const profileErrorMsg = document.getElementById('profile-error-msg');
    const passwordErrorMsg = document.getElementById('password-error-msg');
    const successToast = document.getElementById('success-toast');
    const toastMessage = document.getElementById('toast-message');


    const API_BASE_URL = 'http://127.0.0.1:5000';
    const parseJwt = (token) => {
        try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
    };

    const apiFetch = async (endpoint, options = {}) => {
        const token = localStorage.getItem('jwtToken');
        const headers = { ...options.headers };
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'An error occurred.');
            return data;
        } else {
             if (!response.ok) throw new Error('An HTTP error occurred.');
             return null;
        }
    };

    const showToast = (message) => {
        toastMessage.textContent = message;
        successToast.classList.remove('hidden');
        setTimeout(() => successToast.classList.add('hidden'), 3000);
    };


    const initialize = async () => {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            window.location.href = '/';
            return;
        }
        updateUIToLoggedIn();
        setupFooter();
        await fetchAndDisplayApplications();
    };

    function updateUIToLoggedIn() {
        navButtons.innerHTML = `
            <a href="/" style="font-size: 0.875rem; font-weight: 500; color: #374151;">Home</a>
            <a href="/job_seeker_dashboard" style="font-size: 0.875rem; font-weight: 600; color: #4f46e5;">Dashboard</a>
            <button id="nav-logout-btn" class="button primary-button" style="padding: 0.5rem 1rem; font-size: 0.875rem;">Log Out</button>
        `;
        document.getElementById('nav-logout-btn').addEventListener('click', () => {
            localStorage.removeItem('jwtToken');
            window.location.href = '/';
        });
    }

    const setupFooter = () => {
        const postJobLink = document.getElementById('footer-post-job-link');
        const createProfileLink = document.getElementById('footer-create-profile-link');
        const employerLoginLink = document.getElementById('footer-employer-login-link');
        const jobSeekersSection = document.getElementById('footer-job-seekers');
        const employersSection = document.getElementById('footer-employers');

        const user = parseJwt(localStorage.getItem('jwtToken'));

        jobSeekersSection.style.display = 'block';
        employersSection.style.display = 'none';

        if (user && user.user_type === 3) {
            postJobLink.style.opacity = '0.5';
            postJobLink.style.cursor = 'not-allowed';
            postJobLink.onclick = (e) => { e.preventDefault(); showToast('Only employers can post jobs.'); };
            createProfileLink.href = '/job_seeker_dashboard';
            employerLoginLink.href = '/';
        }
    };

    const fetchAndDisplayApplications = async () => {
        loadingIndicator.style.display = 'block';
        applicationsContainer.innerHTML = '';
        try {
            const applications = await apiFetch('/api/dashboard/applications');
            if (applications.length === 0) {
                applicationsContainer.innerHTML = '<p class="empty-message">You have not applied for any jobs yet.</p>';
            } else {
                applicationsContainer.innerHTML = `
                    <div class="table-wrapper">
                        <table class="applications-table">
                            <thead>
                                <tr>
                                    <th>Job Title</th>
                                    <th>Company</th>
                                    <th>Applied On</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${applications.map(app => `
                                    <tr>
                                        <td><div class="title">${app.job_title}</div></td>
                                        <td><div class="company">${app.company_name}</div></td>
                                        <td><div class="company">${new Date(app.application_date).toLocaleDateString()}</div></td>
                                        <td><span class="status-badge">${app.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        } catch (error) {
            applicationsContainer.innerHTML = `<p class="error-message" style="text-align: center;">${error.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    };

    // --- EVENT HANDLERS ---
    document.getElementById('edit-profile-btn').addEventListener('click', async () => {
        profileErrorMsg.textContent = '';
        passwordErrorMsg.textContent = '';
        editProfileForm.reset();
        changePasswordForm.reset();
        try {
            const profile = await apiFetch('/api/user/profile');
            if (profile) {
                Object.keys(profile).forEach(key => {
                    const el = editProfileForm.elements[key];
                    if (el) {
                        if (el.type === 'date' && profile[key]) {
                            el.value = profile[key].split('T')[0];
                        } else {
                            el.value = profile[key] || '';
                        }
                    }
                });
            }
        } catch (error) {
            profileErrorMsg.textContent = "Could not load profile data.";
        }
        editProfileModal.classList.remove('hidden');
    });

    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        profileErrorMsg.textContent = '';
        const data = Object.fromEntries(new FormData(editProfileForm).entries());
        try {
            const result = await apiFetch('/api/user/profile', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast(result.msg);
            editProfileModal.classList.add('hidden');
        } catch (error) {
            profileErrorMsg.textContent = error.message;
        }
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        passwordErrorMsg.textContent = '';
        const data = Object.fromEntries(new FormData(changePasswordForm).entries());
        try {
            const result = await apiFetch('/api/user/password', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast(result.msg);
            changePasswordForm.reset();
        } catch (error) {
            passwordErrorMsg.textContent = error.message;
        }
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('close-modal-btn')) {
                modal.classList.add('hidden');
            }
        });
    });

    initialize();
});
