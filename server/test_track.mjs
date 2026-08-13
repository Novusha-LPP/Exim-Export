import axios from "axios";

async function testTrack() {
  try {
    const res = await axios.post("http://localhost:9002/api/container-track", {
      containerNo: ["MSKU8765432"]
    });
    console.log("✅ Container track response status:", res.status);
    console.log("Data:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("❌ Container track error:", err.response?.data || err.message);
  }
}

testTrack();
