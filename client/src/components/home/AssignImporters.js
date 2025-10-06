import React from "react";
import UserDetails from "./AssignRole/UserDetails";
import PropTypes from "prop-types";

function AssignImporters({ selectedUser }) {
  // You can add additional logic or props if needed
  if (!selectedUser) return null;
  console.log(selectedUser)
  return <UserDetails selectedUser={selectedUser} onClose={() => {}} />;
}

AssignImporters.propTypes = {
  selectedUser: PropTypes.object,
};

export default AssignImporters;
