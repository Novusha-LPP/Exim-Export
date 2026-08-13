import axios from "axios";

async function testLogin() {
  try {
    const response = await axios.post("http://localhost:9002/api/login", {
      username: "novusha_demo",
      password: "Novusha@2026",
    });
    console.log("✅ DUMMY CLIENT LOGIN SUCCESSFUL!");
    console.log("User details returned by server:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Login failed:", error.response?.data || error.message);
  }
}

testLogin();
