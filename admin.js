const users = [
  { username: "sheilah", password: "sheilah123" },
  { username: "joella", password: "joella123" },
  { username: "roselin", password: "roselin123" },
  { username: "rozalin", password: "rozalin123" },
  { username: "melisse", password: "melisse123" },
  { username: "berny", password: "berny123" },
  { username: "bink", password: "bink123" },
  { username: "vaughn", password: "vaughn123" },
  { username: "elmira", password: "elmira123" },
  { username: "roddie", password: "roddie123" }
];

// Function to validate user
function validateUser(username, password) {
  // Find if there is a user with the given username and password
  const user = users.find(user => user.username === username && user.password === password);
  
  if (user) {
    return "Login successful!";
  } else {
    return "Invalid username or password.";
  }
}

