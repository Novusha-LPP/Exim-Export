import { useEffect, useState } from "react";
import axios from "axios";

function useFetchDSR(detailedStatus, selectedYear) {
  const [rows, setRows] = useState([]);

  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function getData() {
      setRows([]);

      const res = await axios(
        `${import.meta.env.VITE_API_STRING}/dsr/${selectedYear}`
      );

      setRows(res.data);
      setTotal(res.data.total);
    }

    getData();
  }, [detailedStatus, selectedYear]);

  return { rows, total };
}

export default useFetchDSR;
