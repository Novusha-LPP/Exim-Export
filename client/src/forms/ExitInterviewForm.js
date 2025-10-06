import React, { useContext } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import Rating from "@mui/material/Rating";
import { Row, Col } from "react-bootstrap";
import { UserContext } from "../contexts/UserContext";
import { validationSchema } from "../schemas/exitInterview/exitInterviewSchema";

function ExitInterviewForm() {
  const { user } = useContext(UserContext);

  const formik = useFormik({
    initialValues: {
      department: "",
      last_date: "",
      reason_for_leaving: "",
      overall_job_satisfaction: 0,
      clarity_of_job_duties: 0,
      opportunity_to_utilize_skills: 0,
      workload_and_stress_management: 0,
      resources_and_tools_provided: 0,
      quality_of_communication: "",
      support_from_manager: "",
      appreciation_for_work: "",
      collaboration_within_the_team: "",
      overall_company_culture: "",
      approach_of_reporting_manager: "",
      opportunities_for_professional_development: 0,
      effectiveness_of_training_programs_provided: 0,
      support_for_continuing_education: 0,
      recommend_this_company: "",
      suggestions: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const employee_name = [user.first_name, user.middle_name, user.last_name]
        .filter(Boolean)
        .join(" ");
      const company = user.company;

      const res = await axios.post(
        `${import.meta.env.VITE_API_STRING}/add-exit-interview`,
        { ...values, employee_name, company }
      );
      alert(res.data.message);
      resetForm();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} style={{ marginTop: "10px" }}>
      <Row>
        <Col>
          <TextField
            size="small"
            fullWidth
            margin="dense"
            variant="filled"
            id="department"
            name="department"
            label="Department"
            value={formik.values.department}
            onChange={formik.handleChange}
            error={
              formik.touched.department && Boolean(formik.errors.department)
            }
            helperText={formik.touched.department && formik.errors.department}
          />
        </Col>
        <Col>
          <TextField
            size="small"
            fullWidth
            margin="dense"
            variant="filled"
            type="date"
            id="last_date"
            name="last_date"
            label="Last date"
            value={formik.values.last_date}
            onChange={formik.handleChange}
            error={formik.touched.last_date && Boolean(formik.errors.last_date)}
            helperText={formik.touched.last_date && formik.errors.last_date}
            InputLabelProps={{ shrink: true }}
          />
        </Col>
        <Col>
          <TextField
            select
            size="small"
            fullWidth
            margin="dense"
            variant="filled"
            id="reason_for_leaving"
            name="reason_for_leaving"
            label="Reason for leaving"
            value={formik.values.reason_for_leaving}
            onChange={formik.handleChange}
            error={
              formik.touched.reason_for_leaving &&
              Boolean(formik.errors.reason_for_leaving)
            }
            helperText={
              formik.touched.reason_for_leaving &&
              formik.errors.reason_for_leaving
            }
          >
            <MenuItem value="New opportunity">New opportunity</MenuItem>
            <MenuItem value="Returning to institute">
              Returning to institute
            </MenuItem>
            <MenuItem value="Relocation">Relocation</MenuItem>
            <MenuItem value="Retirement">Retirement</MenuItem>
            <MenuItem value="Compensation & Benefits">
              Compensation & Benefits
            </MenuItem>
            <MenuItem value="Work-life balance">Work-life balance</MenuItem>
            <MenuItem value="Management style">Management style</MenuItem>
            <MenuItem value="Development opportunities">
              Development opportunities
            </MenuItem>
            <MenuItem value="Company culture">Company culture</MenuItem>
          </TextField>
        </Col>
      </Row>
      <br />
      <h5>Job Role Satisfaction</h5>
      <Row>
        <Col>
          Overall job satisfaction
          <br />
          <Rating
            name="overall_job_satisfaction"
            value={formik.values.overall_job_satisfaction}
            onChange={(event, newValue) => {
              formik.setFieldValue("overall_job_satisfaction", newValue);
            }}
          />
        </Col>
        <Col>
          Clarity of job duties
          <br />
          <Rating
            name="clarity_of_job_duties"
            value={formik.values.clarity_of_job_duties}
            onChange={(event, newValue) => {
              formik.setFieldValue("clarity_of_job_duties", newValue);
            }}
          />
        </Col>
        <Col>
          Opportunity to utilize skills
          <br />
          <Rating
            name="opportunity_to_utilize_skills"
            value={formik.values.opportunity_to_utilize_skills}
            onChange={(event, newValue) => {
              formik.setFieldValue("opportunity_to_utilize_skills", newValue);
            }}
          />
        </Col>
      </Row>
      <Row>
        <Col>
          Workload and stress management <br />
          <Rating
            name="workload_and_stress_management"
            value={formik.values.workload_and_stress_management}
            onChange={(event, newValue) => {
              formik.setFieldValue("workload_and_stress_management", newValue);
            }}
          />
        </Col>
        <Col>
          Resources and tools provided <br />
          <Rating
            name="resources_and_tools_provided"
            value={formik.values.resources_and_tools_provided}
            onChange={(event, newValue) => {
              formik.setFieldValue("resources_and_tools_provided", newValue);
            }}
          />
        </Col>
        <Col></Col>
      </Row>
      <br />
      <h5>Management & Team Environment</h5>
      <Row>
        <Col>
          <TextField
            size="small"
            fullWidth
            margin="dense"
            variant="filled"
            id="quality_of_communication"
            name="quality_of_communication"
            label="Quality of communication"
            value={formik.values.quality_of_communication}
            onChange={formik.handleChange}
            error={
              formik.touched.quality_of_communication &&
              Boolean(formik.errors.quality_of_communication)
            }
            helperText={
              formik.touched.quality_of_communication &&
              formik.errors.quality_of_communication
            }
          />
        </Col>
        <Col>
          <TextField
            size="small"
            fullWidth
            margin="dense"
            variant="filled"
            id="support_from_manager"
            name="support_from_manager"
            label="Support from manager"
            value={formik.values.support_from_manager}
            onChange={formik.handleChange}
            error={
              formik.touched.support_from_manager &&
              Boolean(formik.errors.support_from_manager)
            }
            helperText={
              formik.touched.support_from_manager &&
              formik.errors.support_from_manager
            }
          />
        </Col>
        <Col>
          <TextField
            size="small"
            fullWidth
            margin="dense"
            variant="filled"
            id="appreciation_for_work"
            name="appreciation_for_work"
            label="Appreciation for work"
            value={formik.values.appreciation_for_work}
            onChange={formik.handleChange}
            error={
              formik.touched.appreciation_for_work &&
              Boolean(formik.errors.appreciation_for_work)
            }
            helperText={
              formik.touched.appreciation_for_work &&
              formik.errors.appreciation_for_work
            }
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <TextField
            size="small"
            fullWidth
            margin="dense"
            variant="filled"
            id="collaboration_within_the_team"
            name="collaboration_within_the_team"
            label="Collaboration within the team"
            value={formik.values.collaboration_within_the_team}
            onChange={formik.handleChange}
            error={
              formik.touched.collaboration_within_the_team &&
              Boolean(formik.errors.collaboration_within_the_team)
            }
            helperText={
              formik.touched.collaboration_within_the_team &&
              formik.errors.collaboration_within_the_team
            }
          />
        </Col>
        <Col>
          <TextField
            size="small"
            fullWidth
            margin="dense"
            variant="filled"
            id="overall_company_culture"
            name="overall_company_culture"
            label="Overall company culture"
            value={formik.values.overall_company_culture}
            onChange={formik.handleChange}
            error={
              formik.touched.overall_company_culture &&
              Boolean(formik.errors.overall_company_culture)
            }
            helperText={
              formik.touched.overall_company_culture &&
              formik.errors.overall_company_culture
            }
          />
        </Col>
        <Col>
          <TextField
            select
            size="small"
            fullWidth
            margin="dense"
            variant="filled"
            id="approach_of_reporting_manager"
            name="approach_of_reporting_manager"
            label="How was the approach of your reporting manager?"
            value={formik.values.approach_of_reporting_manager}
            onChange={formik.handleChange}
            error={
              formik.touched.approach_of_reporting_manager &&
              Boolean(formik.errors.approach_of_reporting_manager)
            }
            helperText={
              formik.touched.approach_of_reporting_manager &&
              formik.errors.approach_of_reporting_manager
            }
          >
            <MenuItem value="Proactive and supportive">
              Proactive and supportive
            </MenuItem>
            <MenuItem value="Micromanaging and controlling">
              Micromanaging and controlling
            </MenuItem>
            <MenuItem value="Provided clear direction but lacked support">
              Provided clear direction but lacked support
            </MenuItem>
          </TextField>
        </Col>
      </Row>

      <br />
      <h5>Training & Development</h5>
      <Row>
        <Col>
          Opportunities for professional development
          <br />
          <Rating
            name="opportunities_for_professional_development"
            value={formik.values.opportunities_for_professional_development}
            onChange={(event, newValue) => {
              formik.setFieldValue(
                "opportunities_for_professional_development",
                newValue
              );
            }}
          />
        </Col>
        <Col>
          Effectiveness of training programs provided
          <br />
          <Rating
            name="effectiveness_of_training_programs_provided"
            value={formik.values.effectiveness_of_training_programs_provided}
            onChange={(event, newValue) => {
              formik.setFieldValue(
                "effectiveness_of_training_programs_provided",
                newValue
              );
            }}
          />
        </Col>
        <Col>
          Support for continuing education
          <br />
          <Rating
            name="support_for_continuing_education"
            value={formik.values.support_for_continuing_education}
            onChange={(event, newValue) => {
              formik.setFieldValue(
                "support_for_continuing_education",
                newValue
              );
            }}
          />
        </Col>
      </Row>
      <TextField
        size="small"
        fullWidth
        margin="dense"
        variant="filled"
        select
        id="recommend_this_company"
        name="recommend_this_company"
        label="Would you recommend this company to a friend as a place to work?"
        value={formik.values.recommend_this_company}
        onChange={formik.handleChange}
        error={
          formik.touched.recommend_this_company &&
          Boolean(formik.errors.recommend_this_company)
        }
        helperText={
          formik.touched.recommend_this_company &&
          formik.errors.recommend_this_company
        }
      >
        <MenuItem value="Yes">Yes</MenuItem>
        <MenuItem value="No">No</MenuItem>
      </TextField>
      <TextField
        size="small"
        fullWidth
        margin="dense"
        variant="filled"
        id="suggestions"
        name="suggestions"
        label="Suggestions for improvement"
        value={formik.values.suggestions}
        onChange={formik.handleChange}
        error={formik.touched.suggestions && Boolean(formik.errors.suggestions)}
        helperText={formik.touched.suggestions && formik.errors.suggestions}
      />
      <button type="submit" className="btn">
        Submit
      </button>
    </form>
  );
}

export default ExitInterviewForm;
