// Validation functions
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  // Vietnamese phone number format: 10-11 digits starting with 0
  const phoneRegex = /^0[0-9]{9,10}$/;
  return phoneRegex.test(phone);
}

function validateUsername(username) {
  // Username: 3-20 characters, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

function validatePassword(password) {
  // Password: at least 6 characters
  return password.length >= 6;
}

function validateFullName(fullName) {
  // Full name: 2-50 characters, letters and spaces only
  const nameRegex = /^[a-zA-Z\s]{2,50}$/;
  return nameRegex.test(fullName);
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorDiv = field.parentElement.querySelector('.field-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  field.style.borderColor = 'red';
}

function hideFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorDiv = field.parentElement.querySelector('.field-error');
  errorDiv.style.display = 'none';
  field.style.borderColor = '';
}

function validateForm() {
  let isValid = true;
  
  // Get form values
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const RPpass = document.getElementById("RPpassword").value;
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();

  // Clear all previous errors
  hideFieldError("username");
  hideFieldError("password");
  hideFieldError("RPpassword");
  hideFieldError("fullName");
  hideFieldError("email");
  hideFieldError("phone");

  // Validate username
  if (!username) {
    showFieldError("username", "Username is required");
    isValid = false;
  } else if (!validateUsername(username)) {
    showFieldError("username", "Username must be 3-20 characters, letters, numbers and underscore only");
    isValid = false;
  }

  // Validate password
  if (!password) {
    showFieldError("password", "Password is required");
    isValid = false;
  } else if (!validatePassword(password)) {
    showFieldError("password", "Password must be at least 6 characters");
    isValid = false;
  }

  // Validate repeat password
  if (!RPpass) {
    showFieldError("RPpassword", "Please repeat your password");
    isValid = false;
  } else if (password !== RPpass) {
    showFieldError("RPpassword", "Passwords do not match");
    isValid = false;
  }

  // Validate full name
  if (!fullName) {
    showFieldError("fullName", "Full name is required");
    isValid = false;
  } else if (!validateFullName(fullName)) {
    showFieldError("fullName", "Full name must be 2-50 characters, letters and spaces only");
    isValid = false;
  }

  // Validate email
  if (!email) {
    showFieldError("email", "Email is required");
    isValid = false;
  } else if (!validateEmail(email)) {
    showFieldError("email", "Please enter a valid email address");
    isValid = false;
  }

  // Validate phone
  if (!phone) {
    showFieldError("phone", "Phone number is required");
    isValid = false;
  } else if (!validatePhone(phone)) {
    showFieldError("phone", "Please enter a valid Vietnamese phone number (10-11 digits starting with 0)");
    isValid = false;
  }

  return isValid;
}

// Real-time validation
document.addEventListener('DOMContentLoaded', function() {
  const fields = ['username', 'password', 'RPpassword', 'fullName', 'email', 'phone'];
  
  fields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    field.addEventListener('blur', function() {
      const value = this.value.trim();
      
      switch(fieldId) {
        case 'username':
          if (value && !validateUsername(value)) {
            showFieldError(fieldId, "Username must be 3-20 characters, letters, numbers and underscore only");
          } else {
            hideFieldError(fieldId);
          }
          break;
        case 'password':
          if (value && !validatePassword(value)) {
            showFieldError(fieldId, "Password must be at least 6 characters");
          } else {
            hideFieldError(fieldId);
          }
          break;
        case 'RPpassword':
          const password = document.getElementById('password').value;
          if (value && value !== password) {
            showFieldError(fieldId, "Passwords do not match");
          } else {
            hideFieldError(fieldId);
          }
          break;
        case 'fullName':
          if (value && !validateFullName(value)) {
            showFieldError(fieldId, "Full name must be 2-50 characters, letters and spaces only");
          } else {
            hideFieldError(fieldId);
          }
          break;
        case 'email':
          if (value && !validateEmail(value)) {
            showFieldError(fieldId, "Please enter a valid email address");
          } else {
            hideFieldError(fieldId);
          }
          break;
        case 'phone':
          if (value && !validatePhone(value)) {
            showFieldError(fieldId, "Please enter a valid Vietnamese phone number (10-11 digits starting with 0)");
          } else {
            hideFieldError(fieldId);
          }
          break;
      }
    });
  });
});

// Main signup function
document.getElementById("saveCustomerBtn").addEventListener("click", async function (e) {
  e.preventDefault();

  // Hide previous messages
  document.querySelector(".error-message").style.display = "none";
  document.querySelector(".success-message").style.display = "none";

  // Validate form
  if (!validateForm()) {
    return;
  }

  // Show loading
  const loadingIcon = document.querySelector(".loading-icon");
  loadingIcon.style.display = "inline";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const RPpass = document.getElementById("RPpassword").value;
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();

  try {
    const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, RPpass, fullName, email, phone })
    });

    const data = await response.json();

    if (response.ok) {
        // Hiển thị thông báo thành công
        document.querySelector(".success-message").textContent = data.message;
        document.querySelector(".success-message").style.display = "block";

        // Sau khi đăng ký thành công, chuyển hướng đến trang login
        setTimeout(function() {
            window.location.href = '/UI/loginUser.html';
        }, 2000);
    } else {
        // Hiển thị thông báo lỗi
        document.querySelector(".error-message").textContent = data.message;
        document.querySelector(".error-message").style.display = "block";
    }
  } catch (error) {
    document.querySelector(".error-message").textContent = "Network error. Please try again.";
    document.querySelector(".error-message").style.display = "block";
  } finally {
    // Hide loading
    loadingIcon.style.display = "none";
  }
});


