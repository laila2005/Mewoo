//login btn 
function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (email === "" || password === "") {
        alert("Please fill all fields");
        return;
    }

    alert("Login Successful 🎉");

    window.location.href = "user.html";
}