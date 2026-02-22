// STEP 1: SETUP VARIABLES

// This stores the current logged-in user (null = not logged in)
let currentUser = null;

// Flag to track if user just completed verification
let justVerified = false;

// This is the key we use to save data in localStorage
const STORAGE_KEY = "ipt_demo_v1";

// This is our "database" - stored in browser's localStorage
window.db = {};

// STEP 2: LOAD DATA FROM STORAGE

// This runs when the page loads
// It loads saved data or creates default data
function loadFromStorage() {
  // Try to get saved data from localStorage
  const rawData = localStorage.getItem(STORAGE_KEY);
  
  if (rawData) {
    // If data exists, parse it from JSON string to object
    try {
      window.db = JSON.parse(rawData);
      // Ensure all required arrays exist
      if (!window.db.accounts) window.db.accounts = [];
      if (!window.db.departments) window.db.departments = [];
      if (!window.db.employees) window.db.employees = [];
      if (!window.db.requests) window.db.requests = [];
    } catch (e) {
      // If data is corrupt, seed with default data
      seedDefaultData();
      return;
    }
    
    // Ensure admin account exists with correct credentials
    ensureAdminAccount();
  } else {
    // If no data exists, create default data
    seedDefaultData();
  }
}

// Seed default data for new/corrupt storage
function seedDefaultData() {
  window.db = {
    // Default admin account
    accounts: [
      {
        firstName: "Admin",
        lastName: "Admin",
        email: "admin@example.com",
        password: "Password123!",
        role: "admin",
        verified: true
      }
    ],
    // Default departments
    departments: [
      { id: 1, name: "Engineering", description: "Software development team" },
      { id: 2, name: "HR", description: "Human resources team" }
    ],
    // Empty lists for employees and requests
    employees: [],
    requests: []
  };
  // Save the default data
  saveToStorage();
}

// Ensure admin account exists with correct credentials
function ensureAdminAccount() {
  const adminEmail = "admin@example.com";
  const adminPassword = "Password123!";
  
  // Find existing admin account
  const adminIndex = window.db.accounts.findIndex(account => account.email === adminEmail);
  
  if (adminIndex >= 0) {
    // Update existing admin account with correct credentials
    window.db.accounts[adminIndex] = {
      firstName: "Admin",
      lastName: "Admin",
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      verified: true
    };
  } else {
    // Add admin account if it doesn't exist
    window.db.accounts.unshift({
      firstName: "Admin",
      lastName: "Admin",
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      verified: true
    });
  }
  
  // Save updated data
  saveToStorage();
}

// STEP 3: SAVE DATA TO STORAGE

// This saves our database to localStorage
function saveToStorage() {
  // Convert object to JSON string and save
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// STEP 4: NAVIGATION (ROUTING)

// Change the URL hash to navigate to a page
function navigateTo(hash) {
  window.location.hash = hash;
}

// This function runs when URL hash changes
// It shows/hides pages based on the URL
function handleRouting() {
  // Get the current hash (default to "#/" if none)
  let hash = window.location.hash || "#/";
  
  // Hide all pages first
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  // Convert hash to page ID
  // Example: "#/login" becomes "login-page"
  const pageName = hash.replace("#/", "");
  const pageId = pageName + "-page";
  
  // Find the page element
  let page = document.getElementById(pageId);
  
  // If page not found, show home page
  if (!page) {
    page = document.getElementById("home-page");
  }

  // Handle verified message visibility
  // Only show "Email verified" message right after verification
  const verifiedMessage = document.getElementById("verified-message");
  if (verifiedMessage) {
    if (pageName === "login" && justVerified) {
      // Just verified - show the message
      verifiedMessage.style.display = "block";
      justVerified = false; // Reset flag
    } else {
      // Any other time - hide the message
      verifiedMessage.style.display = "none";
    }
  }

  // SECURITY: Check if user needs to be logged in
  const protectedPages = ["profile", "accounts", "employees", "department", "requests"];
  
  if (!currentUser && protectedPages.includes(pageName)) {
    // Not logged in - redirect to login
    navigateTo("#/login");
    return;
  }

  // SECURITY: Check if user needs admin role
  const adminOnlyPages = ["accounts", "employees", "department"];
  
  if (currentUser && currentUser.role !== "admin" && adminOnlyPages.includes(pageName)) {
    // Not admin - redirect to home
    navigateTo("#/");
    return;
  }

  
  // Show the page
  page.classList.add("active");
  
  // Update profile page if we're on it
  if (pageName === "profile") {
    renderProfile();
  }
  
  // Render accounts table if on accounts page
  if (pageName === "accounts") {
    renderAccountsList();
  }
  
  // Render departments table if on department page
  if (pageName === "department") {
    renderDepartmentsTable();
  }
  
  // Render employees table if on employees page
  if (pageName === "employees") {
    renderEmployeesTable();
  }
  
  // Render requests table if on requests page
  if (pageName === "requests") {
    renderRequestsTable();
  }
  
  // Show email on verify-email page
  if (pageName === "verify-email") {
    const verifyEmailDisplay = document.getElementById("verify-email-display");
    const unverifiedEmail = localStorage.getItem("unverified_email");
    if (verifyEmailDisplay && unverifiedEmail) {
      verifyEmailDisplay.innerText = unverifiedEmail;
    }
  }
}

// Listen for URL hash changes
window.addEventListener("hashchange", handleRouting);

// STEP 5: AUTHENTICATION STATE

// This updates the UI based on login state
function setAuthState(isLoggedIn, user = null) {
  // Store the current user
  currentUser = user;

  // Update body classes for CSS styling
  document.body.classList.toggle("authenticated", isLoggedIn);
  document.body.classList.toggle("not-authenticated", !isLoggedIn);

  // Add admin class if user is admin
  if (user && user.role === "admin") {
    document.body.classList.add("is-admin");
  } else {
    document.body.classList.remove("is-admin");
  }

  // Update navigation to show username
  const navUsername = document.getElementById("nav-username");
  if (navUsername) {
    if (user) {
      navUsername.innerText = user.firstName;
    } else {
      // Clear username when logging out
      navUsername.innerText = "User";
    }
  }
}

// STEP 6: LOGIN FUNCTION

function handleLogin() {
  // Get input values
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  // Validate inputs
  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  // Find user in our database
  const user = window.db.accounts.find(account => 
    account.email === email && 
    account.password === password &&
    account.verified === true
  );

  if (user) {
    // Login successful!
    // Save a fake "auth token" (just the email)
    localStorage.setItem("auth_token", user.email);
    
    // Update the UI state
    setAuthState(true, user);
    
    // Navigate to profile page
    navigateTo("#/profile");
    
    alert("Login successful! Welcome, " + user.firstName);
  } else {
    // Login failed
    alert("Invalid email or password, or account not verified");
  }
}

// STEP 7: REGISTER FUNCTION

function handleRegister() {
  // Get input values
  const firstName = document.getElementById("reg-firstname").value;
  const lastName = document.getElementById("reg-lastname").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  // Validate inputs - check all fields are filled
  if (!firstName || !lastName || !email || !password) {
    alert("Please fill in all fields");
    return;
  }

  // Validate password minimum length (6 chars)
  if (password.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  // Check if email already exists
  const existingUser = window.db.accounts.find(account => 
    account.email === email
  );

  if (existingUser) {
    alert("Email already registered");
    return;
  }

  // Create new user with verified: false
  const newUser = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    password: password,
    role: "user", // Default role is "user"
    verified: false // Needs verification
  };

  // Add to database
  window.db.accounts.push(newUser);
  saveToStorage();

  // Store email in localStorage.unverified_email
  localStorage.setItem("unverified_email", email);

  // Navigate to verify-email page
  alert("Registration successful! Please verify your email.");
  navigateTo("#/verify-email");
}

// STEP 8: EMAIL VERIFICATION FUNCTION

function handleVerify() {
  // In a real app, this would check a verification code
  // For this demo, we just mark the user as verified
  
  // Get the unverified email from localStorage
  const unverifiedEmail = localStorage.getItem("unverified_email");
  
  if (!unverifiedEmail) {
    alert("No pending verification found");
    navigateTo("#/login");
    return;
  }
  
  // Find account by unverified_email
  const user = window.db.accounts.find(account => 
    account.email === unverifiedEmail
  );
  
  if (user) {
    // Set verified to true
    user.verified = true;
    saveToStorage();
    
    // Clear the unverified_email from localStorage
    localStorage.removeItem("unverified_email");
    
    // Set flag to show verified message on login page
    justVerified = true;
    
    alert("Email verified! You can now login.");
    navigateTo("#/login");
  } else {
    alert("Account not found. Please register again.");
    navigateTo("#/register");
  }
}

// STEP 9: LOGOUT FUNCTION

function handleLogout() {
  // Clear the auth token
  localStorage.removeItem("auth_token");
  
  // Reset the UI state
  setAuthState(false, null);
  
  // Navigate to home
  navigateTo("#/");
  
  alert("You have been logged out");
}

// STEP 10: PAGE INITIALIZATION

// This runs when the page finishes loading
document.addEventListener("DOMContentLoaded", function() {
  // Load data from storage
  loadFromStorage();
  
  // Check if user is already logged in (has auth token)
  const savedToken = localStorage.getItem("auth_token");
  if (savedToken) {
    // Find the user by email
    const user = window.db.accounts.find(account => 
      account.email === savedToken
    );
    if (user) {
      setAuthState(true, user);
    }
  }
  
  // Setup routing
  handleRouting();
  
  // Add click handlers to buttons
  setupButtonHandlers();
});

// STEP 11: BUTTON HANDLERS

function setupButtonHandlers() {
  // Get Started button - goes to register page
  const getStartedBtn = document.querySelector(".getstarted-btn");
  if (getStartedBtn) {
    getStartedBtn.onclick = function() {
      navigateTo("#/register");
    };
  }

  // Login button
  const loginBtn = document.querySelector("#login-page .btn-primary");
  if (loginBtn) {
    loginBtn.onclick = handleLogin;
  }

  // Register button
  const registerBtn = document.querySelector("#register-page .btn-success");
  if (registerBtn) {
    registerBtn.onclick = handleRegister;
  }

  // Verify button (updated to new page ID)
  const verifyBtn = document.querySelector("#verify-email-page .btn-success");
  if (verifyBtn) {
    verifyBtn.onclick = handleVerify;
  }

  // Accounts page buttons
  const addAccountBtn = document.querySelector("#accounts-page .flexMe .btn-success");
  if (addAccountBtn) {
    addAccountBtn.onclick = showAddAccountForm;
  }
  
  const saveAccountBtn = document.querySelector("#accounts-page .actions .btn-primary");
  if (saveAccountBtn) {
    saveAccountBtn.onclick = saveAccount;
  }
  
  const cancelAccountBtn = document.querySelector("#accounts-page .actions .btn-secondary");
  if (cancelAccountBtn) {
    cancelAccountBtn.onclick = cancelAccountForm;
  }

  // Departments page buttons
  const addDeptBtn = document.querySelector("#department-page .flexMe .btn-success");
  if (addDeptBtn) {
    addDeptBtn.onclick = showAddDepartmentForm;
  }

  // Employees page buttons
  const addEmpBtn = document.querySelector("#employees-page .bulagon .btn-success");
  if (addEmpBtn) {
    addEmpBtn.onclick = showAddEmployeeForm;
  }
  
  const saveEmpBtn = document.querySelector("#employees-page .actions .btn-primary");
  if (saveEmpBtn) {
    saveEmpBtn.onclick = saveEmployee;
  }
  
  const cancelEmpBtn = document.querySelector("#employees-page .actions .btn-secondary");
  if (cancelEmpBtn) {
    cancelEmpBtn.onclick = cancelEmployeeForm;
  }

  // Requests page buttons
  const newReqBtn = document.querySelector("#requests-page .flexMe .btn-success");
  if (newReqBtn) {
    newReqBtn.onclick = function() {
      resetRequestForm();
      const modalElement = document.getElementById("exampleModal");
      const existingModal = bootstrap.Modal.getInstance(modalElement);
      if (existingModal) {
        existingModal.show();
      } else {
        new bootstrap.Modal(modalElement).show();
      }
    };
  }
  
  const createReqBtn = document.querySelector("#requests-page .create-request-btn");
  if (createReqBtn) {
    createReqBtn.onclick = function() {
      resetRequestForm();
      const modalElement = document.getElementById("exampleModal");
      const existingModal = bootstrap.Modal.getInstance(modalElement);
      if (existingModal) {
        existingModal.show();
      } else {
        new bootstrap.Modal(modalElement).show();
      }
    };
  }

  // Navigation links
  setupNavigationLinks();
}

// STEP 12: NAVIGATION LINKS

function setupNavigationLinks() {
  // Login link in nav
  const loginLink = document.querySelector('.links a[href="#login"]');
  if (loginLink) {
    loginLink.onclick = function(e) {
      e.preventDefault();
      navigateTo("#/login");
    };
  }

  // Register link in nav
  const registerLink = document.querySelector('.links a[href="#register"]');
  if (registerLink) {
    registerLink.onclick = function(e) {
      e.preventDefault();
      navigateTo("#/register");
    };
  }

  // Handle logout link
  const logoutLink = document.querySelector(".dropdown-item[href='#logout']");
  if (logoutLink) {
    logoutLink.onclick = function(e) {
      e.preventDefault();
      handleLogout();
    };
  }

  // Setup dropdown menu navigation links using event delegation
  const dropdownMenu = document.querySelector('.nav-admin .dropdown-menu');
  if (dropdownMenu) {
    dropdownMenu.addEventListener('click', function(e) {
      const link = e.target.closest('.dropdown-item');
      if (link) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#') && href !== '#logout') {
          e.preventDefault();
          e.stopPropagation();
          const page = href.replace('#', '');
          navigateTo('#/' + page);
        }
      }
    });
  }
}

// HELPER FUNCTIONS (can be called from HTML onclick)

// Go to register page - can be used with onclick="goToRegister()"
function goToRegister() {
  navigateTo("#/register");
}
// Go to login page - can be used with onclick="goToLogin()"
function goToLogin() {
  navigateTo("#/login");
}

// STEP 13: RENDER PROFILE PAGE WITH USER DATA

function renderProfile() {
    // Only render if user is logged in
    if (!currentUser) return;
    
    // Get the profile content container
    const profileContent = document.getElementById("profile-content");
    
    if (profileContent) {
        // Build the HTML with dynamic user data
        profileContent.innerHTML = `
            <h3>${currentUser.firstName} ${currentUser.lastName}</h3>
            <p><strong>Email: </strong><span>${currentUser.email}</span></p>
            <p><strong>Role: </strong><span>${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</span></p>
            <button class="btn btn-primary" onclick="showEditProfile()">Edit Profile</button>
        `;
    }
    
    // Hide edit form when showing profile
    const editForm = document.getElementById("profile-edit");
    if (editForm) {
        editForm.style.display = "none";
    }
}

// STEP 14: EDIT PROFILE FUNCTIONS

// Show the edit profile form
function showEditProfile() {
    if (!currentUser) return;
    
    // Populate the edit form with current user data
    document.getElementById("edit-firstname").value = currentUser.firstName;
    document.getElementById("edit-lastname").value = currentUser.lastName;
    document.getElementById("edit-email").value = currentUser.email;
    document.getElementById("edit-password").value = "";
    
    // Hide profile content, show edit form
    document.getElementById("profile-content").style.display = "none";
    document.getElementById("profile-edit").style.display = "block";
}

// Cancel editing and return to profile view
function cancelEditProfile() {
    document.getElementById("profile-content").style.display = "block";
    document.getElementById("profile-edit").style.display = "none";
}

// Save profile changes
function handleSaveProfile() {
    if (!currentUser) return;
    
    const firstName = document.getElementById("edit-firstname").value;
    const lastName = document.getElementById("edit-lastname").value;
    const newPassword = document.getElementById("edit-password").value;
    
    // Validate inputs
    if (!firstName || !lastName) {
        alert("First name and last name are required");
        return;
    }
    
    // Find the user in the database and update
    const userIndex = window.db.accounts.findIndex(account => 
        account.email === currentUser.email
    );
    
    if (userIndex !== -1) {
        // Update user data
        window.db.accounts[userIndex].firstName = firstName;
        window.db.accounts[userIndex].lastName = lastName;
        
        // Update password only if a new one was entered
        if (newPassword) {
            window.db.accounts[userIndex].password = newPassword;
        }
        
        // Save to localStorage
        saveToStorage();
        
        // Update currentUser
        currentUser.firstName = firstName;
        currentUser.lastName = lastName;
        if (newPassword) {
            currentUser.password = newPassword;
        }
        
        // Update nav username
        const navUsername = document.getElementById("nav-username");
        if (navUsername) {
            navUsername.innerText = firstName;
        }
        
        // Show profile content again
        document.getElementById("profile-content").style.display = "block";
        document.getElementById("profile-edit").style.display = "none";
        
        // Update the profile display
        renderProfile();
        
        alert("Profile updated successfully!");
    }
}

// ===========================================
//   ACCOUNTS CRUD FUNCTIONALITY
// ===========================================

// Render accounts table
function renderAccountsList() {
    const tbody = document.querySelector("#accounts-page tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    window.db.accounts.forEach((account, index) => {
        const verifiedHtml = account.verified 
            ? '<span class="verified-check">✓</span>' 
            : '<span class="verified-x">✗</span>';
        
        const roleDisplay = account.role.charAt(0).toUpperCase() + account.role.slice(1);
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${account.firstName} ${account.lastName}</td>
            <td>${account.email}</td>
            <td>${roleDisplay}</td>
            <td>${verifiedHtml}</td>
            <td class="tb-btn-holder">
                <button type="button" class="btn btn-outline-primary" onclick="editAccount(${index})">Edit</button>
                <button type="button" class="btn btn-outline-warning" onclick="resetAccountPassword(${index})">Reset Password</button>
                <button type="button" class="btn btn-outline-danger" onclick="deleteAccount(${index})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Variable to track if we're editing an account
let editingAccountIndex = -1;

// Show add account form
function showAddAccountForm() {
    editingAccountIndex = -1;
    document.querySelector("#accounts-page .addedit-header").textContent = "Add Account";
    document.querySelector("#accounts-page #firstname").value = "";
    document.querySelector("#accounts-page #lastname").value = "";
    document.querySelector("#accounts-page #acc-email").value = "";
    document.querySelector("#accounts-page #acc-password").value = "";
    document.querySelector("#accounts-page #role").value = "user";
    document.querySelector("#accounts-page #verified").checked = false;
    document.querySelector("#accounts-page .addedit").style.display = "block";
}

// Edit account
function editAccount(index) {
    editingAccountIndex = index;
    const account = window.db.accounts[index];
    
    document.querySelector("#accounts-page .addedit-header").textContent = "Edit Account";
    document.querySelector("#accounts-page #firstname").value = account.firstName;
    document.querySelector("#accounts-page #lastname").value = account.lastName;
    document.querySelector("#accounts-page #acc-email").value = account.email;
    document.querySelector("#accounts-page #acc-password").value = "";
    document.querySelector("#accounts-page #role").value = account.role;
    document.querySelector("#accounts-page #verified").checked = account.verified;
    document.querySelector("#accounts-page .addedit").style.display = "block";
}

// Save account (add or edit)
function saveAccount() {
    const firstName = document.querySelector("#accounts-page #firstname").value;
    const lastName = document.querySelector("#accounts-page #lastname").value;
    const email = document.querySelector("#accounts-page #acc-email").value;
    const password = document.querySelector("#accounts-page #acc-password").value;
    const role = document.querySelector("#accounts-page #role").value;
    const verified = document.querySelector("#accounts-page #verified").checked;
    
    // Validate
    if (!firstName || !lastName || !email) {
        alert("First name, last name, and email are required");
        return;
    }
    
    if (editingAccountIndex === -1) {
        // Adding new account
        if (!password) {
            alert("Password is required for new accounts");
            return;
        }
        if (password.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }
        
        // Check if email exists
        if (window.db.accounts.some(a => a.email === email)) {
            alert("Email already exists");
            return;
        }
        
        window.db.accounts.push({
            firstName,
            lastName,
            email,
            password,
            role,
            verified
        });
    } else {
        // Editing existing account
        const account = window.db.accounts[editingAccountIndex];
        account.firstName = firstName;
        account.lastName = lastName;
        
        // Only update email if it's changed and doesn't exist
        if (email !== account.email) {
            if (window.db.accounts.some(a => a.email === email)) {
                alert("Email already exists");
                return;
            }
            account.email = email;
        }
        
        // Only update password if provided
        if (password) {
            if (password.length < 6) {
                alert("Password must be at least 6 characters");
                return;
            }
            account.password = password;
        }
        
        account.role = role;
        account.verified = verified;
    }
    
    saveToStorage();
    renderAccountsList();
    cancelAccountForm();
    alert(editingAccountIndex === -1 ? "Account created successfully!" : "Account updated successfully!");
}

// Cancel account form
function cancelAccountForm() {
    document.querySelector("#accounts-page .addedit").style.display = "none";
    editingAccountIndex = -1;
}

// Reset account password
function resetAccountPassword(index) {
    const account = window.db.accounts[index];
    const newPassword = prompt("Enter new password for " + account.email + " (min 6 characters):");
    
    if (newPassword === null) return; // User cancelled
    
    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }
    
    account.password = newPassword;
    saveToStorage();
    alert("Password reset successfully!");
}

// Delete account
function deleteAccount(index) {
    const account = window.db.accounts[index];
    
    // Prevent self-deletion
    if (currentUser && account.email === currentUser.email) {
        alert("You cannot delete your own account!");
        return;
    }
    
    if (confirm("Are you sure you want to delete " + account.email + "?")) {
        window.db.accounts.splice(index, 1);
        saveToStorage();
        renderAccountsList();
        alert("Account deleted successfully!");
    }
}

// ===========================================
//   DEPARTMENTS CRUD FUNCTIONALITY
// ===========================================

// Render departments table
function renderDepartmentsTable() {
    const tbody = document.querySelector("#department-page tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    window.db.departments.forEach((dept, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${dept.name}</td>
            <td>${dept.description}</td>
            <td class="tb-btn-holder">
                <button type="button" class="btn btn-outline-primary" onclick="editDepartment(${index})">Edit</button>
                <button type="button" class="btn btn-outline-danger" onclick="deleteDepartment(${index})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Variable to track if we're editing a department
let editingDeptIndex = -1;

// Show add department form - Not implemented for now
function showAddDepartmentForm() {
    alert("Not implemented");
}

// Edit department
function editDepartment(index) {
    const dept = window.db.departments[index];
    
    const name = prompt("Enter department name:", dept.name);
    if (!name) return;
    
    const description = prompt("Enter department description:", dept.description);
    if (description === null) return;
    
    dept.name = name;
    dept.description = description;
    
    saveToStorage();
    renderDepartmentsTable();
    alert("Department updated successfully!");
}

// Delete department
function deleteDepartment(index) {
    const dept = window.db.departments[index];
    
    if (confirm("Are you sure you want to delete " + dept.name + "?")) {
        window.db.departments.splice(index, 1);
        saveToStorage();
        renderDepartmentsTable();
        alert("Department deleted successfully!");
    }
}

// ===========================================
//   EMPLOYEES CRUD FUNCTIONALITY
// ===========================================

// Render employees table
function renderEmployeesTable() {
    const tbody = document.querySelector("#employees-page tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    window.db.employees.forEach((emp, index) => {
        const dept = window.db.departments.find(d => d.id == emp.departmentId);
        // Only show Engineering or HR, filter out invalid departments
        const deptName = (dept && (dept.name === "Engineering" || dept.name === "HR")) ? dept.name : "";
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <th scope="row">${emp.id}</th>
            <td>${emp.email}</td>
            <td>${emp.position}</td>
            <td>${deptName}</td>
            <td class="tb-btn-holder">
                <button type="button" class="btn btn-outline-primary" onclick="editEmployee(${index})">Edit</button>
                <button type="button" class="btn btn-outline-danger" onclick="deleteEmployee(${index})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Variable to track if we're editing an employee
let editingEmployeeIndex = -1;

// Populate department dropdown with only Engineering and HR
function populateDepartmentDropdown() {
    const select = document.querySelector("#employees-page #department");
    if (!select) return;
    
    select.innerHTML = '<option value="">Select department...</option>';
    
    // Only show Engineering and HR departments
    const allowedDepts = window.db.departments.filter(dept => 
        dept.name === "Engineering" || dept.name === "HR"
    );
    
    allowedDepts.forEach(dept => {
        const option = document.createElement("option");
        option.value = dept.id;
        option.textContent = dept.name;
        select.appendChild(option);
    });
}

// Show add employee form
function showAddEmployeeForm() {
    editingEmployeeIndex = -1;
    document.querySelector("#employees-page .addedit-header").textContent = "Add Employee";
    document.querySelector("#employees-page #empid").value = "";
    document.querySelector("#employees-page #emp-email").value = "";
    document.querySelector("#employees-page #position").value = "";
    populateDepartmentDropdown();
    document.querySelector("#employees-page #date").value = "";
    document.querySelector("#employees-page .addedit").style.display = "block";
}

// Edit employee
function editEmployee(index) {
    editingEmployeeIndex = index;
    const emp = window.db.employees[index];
    
    document.querySelector("#employees-page .addedit-header").textContent = "Edit Employee";
    document.querySelector("#employees-page #empid").value = emp.id;
    document.querySelector("#employees-page #emp-email").value = emp.email;
    document.querySelector("#employees-page #position").value = emp.position;
    populateDepartmentDropdown();
    document.querySelector("#employees-page #department").value = emp.departmentId;
    document.querySelector("#employees-page #date").value = emp.hireDate || "";
    document.querySelector("#employees-page .addedit").style.display = "block";
}

// Save employee (add or edit)
function saveEmployee() {
    const id = document.querySelector("#employees-page #empid").value;
    const email = document.querySelector("#employees-page #emp-email").value;
    const position = document.querySelector("#employees-page #position").value;
    const departmentId = document.querySelector("#employees-page #department").value;
    const hireDate = document.querySelector("#employees-page #date").value;
    
    // Validate
    if (!id || !email || !position) {
        alert("Employee ID, Email, and Position are required");
        return;
    }
    
    // Validate department selection - must be Engineering or HR
    if (!departmentId) {
        alert("Please select a department (Engineering or HR)");
        return;
    }
    
    const selectedDept = window.db.departments.find(d => d.id == departmentId);
    if (!selectedDept || (selectedDept.name !== "Engineering" && selectedDept.name !== "HR")) {
        alert("Department must be Engineering or HR");
        return;
    }
    
    // Check if user email exists in accounts
    const account = window.db.accounts.find(a => a.email === email);
    if (!account) {
        alert("Email must match an existing account");
        return;
    }
    
    if (editingEmployeeIndex === -1) {
        // Adding new employee
        // Check if employee ID already exists
        if (window.db.employees.some(e => e.id === id)) {
            alert("Employee ID already exists");
            return;
        }
        
        window.db.employees.push({
            id,
            email,
            position,
            departmentId,
            hireDate
        });
    } else {
        // Editing existing employee
        const emp = window.db.employees[editingEmployeeIndex];
        emp.id = id;
        emp.email = email;
        emp.position = position;
        emp.departmentId = departmentId;
        emp.hireDate = hireDate;
    }
    
    saveToStorage();
    renderEmployeesTable();
    cancelEmployeeForm();
    alert(editingEmployeeIndex === -1 ? "Employee added successfully!" : "Employee updated successfully!");
}

// Cancel employee form
function cancelEmployeeForm() {
    document.querySelector("#employees-page .addedit").style.display = "none";
    editingEmployeeIndex = -1;
}

// Delete employee
function deleteEmployee(index) {
    const emp = window.db.employees[index];
    
    if (confirm("Are you sure you want to delete employee " + emp.id + "?")) {
        window.db.employees.splice(index, 1);
        saveToStorage();
        renderEmployeesTable();
        alert("Employee deleted successfully!");
    }
}

// ===========================================
//   REQUESTS FUNCTIONALITY
// ===========================================

// Render requests table
function renderRequestsTable() {
    console.log("renderRequestsTable called");
    const container = document.querySelector("#requests-page .requests");
    if (!container) {
        console.log("Container not found");
        return;
    }
    
    // Check if user is logged in
    if (!currentUser) {
        console.log("No current user");
        container.innerHTML = '<p>Please log in to view your requests.</p>';
        return;
    }
    
    console.log("Current user email:", currentUser.email);
    console.log("All requests:", window.db.requests);
    
    // Filter requests for current user
    const userRequests = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
    console.log("User requests:", userRequests);
    
    // Find the paragraph, create button, and table
    let table = container.querySelector("table");
    let paragraph = container.querySelector("p");
    let createBtn = container.querySelector(".create-request-btn");
    
    if (userRequests.length === 0) {
        // Remove table if exists
        if (table) table.remove();
        if (paragraph) paragraph.style.display = "block";
        if (createBtn) createBtn.style.display = "inline-block";
        return;
    }
    
    if (paragraph) paragraph.style.display = "none";
    if (createBtn) createBtn.style.display = "none";
    
    if (!table) {
        table = document.createElement("table");
        table.className = "table table-striped";
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        container.appendChild(table);
    }
    
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    
    userRequests.forEach(req => {
        // Status colors: Pending=yellow(warning), Approved=green(success), Rejected=red(danger)
        let statusClass = "warning"; // default yellow for Pending
        if (req.status === "Approved") {
            statusClass = "success"; // green
        } else if (req.status === "Rejected") {
            statusClass = "danger"; // red
        }
        
        const itemsList = req.items.map(i => `${i.name} (${i.qty})`).join(", ");
        
        const row = document.createElement("tr");
        // Columns: Type, Items, Date, Status
        row.innerHTML = `
            <td>${req.type}</td>
            <td>${itemsList}</td>
            <td>${req.date}</td>
            <td><span class="badge bg-${statusClass}">${req.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Add request item
function addRequestItem() {
    const container = document.getElementById("request-items-container");
    const itemDiv = document.createElement("div");
    itemDiv.className = "input-group mb-2";
    itemDiv.innerHTML = `
        <input type="text" class="form-control item-name" placeholder="Item name">
        <input type="number" class="form-control item-qty" value="1" min="1" style="max-width: 80px;">
        <button class="btn btn-outline-danger" type="button" onclick="removeRequestItem(this)">×</button>
    `;
    container.appendChild(itemDiv);
}

// Remove request item
function removeRequestItem(btn) {
    const container = document.getElementById("request-items-container");
    const items = container.querySelectorAll(".input-group");
    // Keep at least one item
    if (items.length > 1) {
        btn.parentElement.remove();
    } else {
        alert("You must have at least one item");
    }
}

// Reset request form
function resetRequestForm() {
    // Reset type dropdown
    const typeSelect = document.getElementById("request-type");
    if (typeSelect) {
        typeSelect.value = "";
    }
    
    // Reset items container to single empty item
    const container = document.getElementById("request-items-container");
    if (container) {
        container.innerHTML = `
            <div class="input-group mb-2">
                <input type="text" class="form-control item-name" placeholder="Item name">
                <input type="number" class="form-control item-qty" value="1" min="1" style="max-width: 80px;">
                <button class="btn btn-outline-danger" type="button" onclick="removeRequestItem(this)">×</button>
            </div>
        `;
    }
}

// Submit request
function submitRequest() {
    console.log("submitRequest called");
    
    // Check if user is logged in
    if (!currentUser) {
        alert("Please log in to submit a request");
        return;
    }
    
    const type = document.getElementById("request-type").value;
    console.log("Request type:", type);
    
    if (!type) {
        alert("Please select a request type");
        return;
    }
    
    // Gather items
    const itemGroups = document.querySelectorAll("#request-items-container .input-group");
    const items = [];
    
    itemGroups.forEach(group => {
        const nameInput = group.querySelector(".item-name");
        const qtyInput = group.querySelector(".item-qty");
        const name = nameInput.value.trim();
        const qty = parseInt(qtyInput.value) || 1;
        
        if (name) {
            items.push({ name, qty });
        }
    });
    
    console.log("Items:", items);
    
    if (items.length === 0) {
        alert("Please add at least one item with a name");
        return;
    }
    
    // Create request
    const today = new Date().toISOString().split('T')[0];
    
    const newRequest = {
        type,
        items,
        status: "Pending",
        date: today,
        employeeEmail: currentUser.email
    };
    
    console.log("New request:", newRequest);
    
    // Ensure requests array exists
    if (!window.db.requests) {
        window.db.requests = [];
    }
    
    window.db.requests.push(newRequest);
    saveToStorage();
    
    console.log("All requests:", window.db.requests);
    
    // Close modal
    const modalElement = document.getElementById("exampleModal");
    if (modalElement) {
        // Try Bootstrap's modal API first
        const bsModal = bootstrap.Modal.getInstance(modalElement);
        if (bsModal) {
            bsModal.hide();
        }
        // Fallback: manually hide modal
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        // Remove backdrop
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
    }
    
    // Reset form
    resetRequestForm();
    
    // Render the table
    console.log("Rendering requests table...");
    renderRequestsTable();
    
    alert("Request submitted successfully!");
}