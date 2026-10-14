import axios from 'axios';

async function testHttp() {
  try {
    const res = await axios.get('http://localhost:9002/api/AMD%2FEXP%2FSEA%2F00513%2F26-27', {
      headers: { username: 'test' }
    });
    console.log('HTTP Status:', res.status);
    console.log('Job No:', res.data.job_no);
    console.log('Containers from HTTP response:');
    (res.data.containers || []).forEach(c => {
      console.log(` - ${c.containerNo}: grossWeight=${c.grossWeight}, sealNo=${c.sealNo}`);
    });
  } catch (err) {
    console.error('HTTP Error:', err.message, err.response?.data);
  }
}

testHttp();
