import React, { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import axios from "axios";

const allModules = [
  "Import - DSR",
  "Import - DO",
  "Import - Operations",
  "Import - Add",
  "Import - Billing",
  "Import Utility Tool",
  "Report",
  "Audit Trail",
  "Accounts",
  "Employee Onboarding",
  "Employee KYC",
  "Inward Register",
  "Outward Register",
  "Customer KYC",
  "Exit Feedback",
  "e-Sanchit",
  "Documentation",
  "Submission",
  "Screen1",
  "Screen2",
  "Screen3",
  "Screen4",
  "Export - Jobs",
  "Export - Audit Trail",
  "Directories",
  "Open Points",
];

function not(a, b) {
  return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a, b) {
  return a.filter((value) => b.indexOf(value) !== -1);
}

function union(a, b) {
  return [...a, ...not(b, a)];
}

function AssignModule(props) {
  const [checked, setChecked] = useState([]);
  const [right, setRight] = useState([]);

  const unAssignedModules = allModules
    .sort()
    .filter((module) => right?.includes(module));
  const [left, setLeft] = useState(unAssignedModules);

  const leftChecked = intersection(checked, left);
  const rightChecked = intersection(checked, right);

  const handleToggle = (value) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  const numberOfChecked = (items) => intersection(checked, items)?.length;

  const handleToggleAll = (items) => () => {
    if (numberOfChecked(items) === items.length) {
      setChecked(not(checked, items));
    } else {
      setChecked(union(checked, items));
    }
  };

  const handleAssignModule = async () => {
    const newRight = right.concat(leftChecked).sort();
    const newLeft = not(left, leftChecked).sort();
    setRight(newRight);
    setLeft(newLeft);
    setChecked(not(checked, leftChecked));
    await axios.post(`${import.meta.env.VITE_API_STRING}/assign-modules`, {
      modules: leftChecked,
      username: props.selectedUser,
      category: props.category,
    });
  };

  const handleUnassignModule = async () => {
    const newLeft = left.concat(rightChecked).sort();
    const newRight = not(right, rightChecked).sort();
    setLeft(newLeft);

    setRight(newRight);
    setChecked(not(checked, rightChecked));
    await axios.post(`${import.meta.env.VITE_API_STRING}/unassign-modules`, {
      modules: rightChecked,
      username: props.selectedUser,
      category: props.category,
    });
  };

  console.log("LEFT", left);
  useEffect(() => {
    async function getUserModules() {
      if (props.selectedUser && props.category) {
        try {
          const res = await axios(
            `${import.meta.env.VITE_API_STRING}/get-user/${props.selectedUser}`
          );

          let userModules = [];
          if (props.category === "Transport") {
            userModules = res.data.transport_modules || [];
          } else if (props.category === "Export") {
            userModules = res.data.export_modules || [];
          } else if (props.category === "Import") {
            userModules = res.data.import_modules || [];
          }

          // Defensive: Log values
          // console.log("userModules", userModules);
          // console.log("allModules", allModules);

          setRight([...userModules].sort());

          // Only run setLeft if allModules is an array
          if (Array.isArray(allModules)) {
            setLeft(
              [...allModules]
                .sort()
                .filter((module) => !userModules.includes(module))
            );
          } else {
            setLeft([]);
          }
        } catch (error) {
          console.error("Error fetching user modules:", error);
          setLeft([]);
          setRight([]);
        }
      } else {
        setLeft([]);
        setRight([]);
      }
    }

    getUserModules();
  }, [props.selectedUser, props.category, allModules]); // add allModules if it's derived async

  const customList = (title, items) => (
    <Card>
      <CardHeader
        sx={{ px: 2 }}
        avatar={
          <Checkbox
            onClick={handleToggleAll(items)}
            checked={
              numberOfChecked(items) === items?.length && items?.length !== 0
            }
            indeterminate={
              numberOfChecked(items) !== items?.length &&
              numberOfChecked(items) !== 0
            }
            disabled={items?.length === 0}
            inputProps={{
              "aria-label": "all items selected",
            }}
          />
        }
        title={title}
        subheader={`${numberOfChecked(items)}/${items?.length} selected`}
      />
      <Divider />
      <List
        sx={{
          width: 400,
          height: 550,
          bgcolor: "background.paper",
          overflow: "auto",
        }}
        dense
        component="div"
        role="list"
      >
        {items?.map((value) => {
          const labelId = `transfer-list-all-item-${value}-label`;

          return (
            <ListItemButton
              key={value}
              role="listitem"
              onClick={handleToggle(value)}
            >
              <ListItemIcon>
                <Checkbox
                  checked={checked.indexOf(value) !== -1}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{
                    "aria-labelledby": labelId,
                  }}
                />
              </ListItemIcon>
              <ListItemText id={labelId} primary={value} />
            </ListItemButton>
          );
        })}
      </List>
    </Card>
  );

  return (
    <div>
      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item>{customList("Available Modules", left)}</Grid>
        <Grid item>
          <Grid container direction="column" alignItems="center">
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleAssignModule}
              disabled={leftChecked?.length === 0}
              aria-label="move selected right"
            >
              &gt;
            </Button>
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleUnassignModule}
              disabled={rightChecked?.length === 0}
              aria-label="move selected left"
            >
              &lt;
            </Button>
          </Grid>
        </Grid>
        <Grid item>{customList("Assigned Modules", right)}</Grid>
      </Grid>
    </div>
  );
}

export default React.memo(AssignModule);
