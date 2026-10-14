import React, { lazy, Suspense } from "react";
import {
  Menu,
  MenuItem,
  CircularProgress,
  ListSubheader,
} from "@mui/material";

// Lazy-loaded standard document generators
const ExportChecklistGenerator = lazy(() => import("../../StandardDocuments/ExportChecklistGenerator"));
const ConsignmentNoteGenerator = lazy(() => import("../../StandardDocuments/ConsignmentNoteGenerator"));
const FileCoverGenerator = lazy(() => import("../../StandardDocuments/FileCoverGenerator"));
const ForwardingNoteTharGenerator = lazy(() => import("../../StandardDocuments/ForwardingNoteTharGenerator"));
const AnnexureCGenerator = lazy(() => import("../../StandardDocuments/AnnexureCGenerator"));
const ConcorForwardingNoteGenerator = lazy(() => import("../../StandardDocuments/ConcorForwardingNoteGenerator.js"));
const VGMAuthorizationGenerator = lazy(() => import("../../StandardDocuments/VGMAuthorizationGenerator"));

const BillOfLadingGenerator = lazy(() => import("../../StandardDocuments/BillOfLadingGenerator"));
const ConcorPltLetterGenerator = lazy(() => import("../../StandardDocuments/ConcorPltLetterGenerator"));
const AnnexureDGenerator = lazy(() => import("../../StandardDocuments/AnnexureDGenerator"));
const StuffingJobRequestGenerator = lazy(() => import("../../StandardDocuments/StuffingJobRequestGenerator"));
const ImportContainerDeliveryOrderGenerator = lazy(() => import("../../StandardDocuments/ImportContainerDeliveryOrderGenerator"));
const BufferContainerGateInToCfsGenerator = lazy(() => import("../../StandardDocuments/BufferContainerGateInToCfsGenerator"));
const CartingJobRequestGenerator = lazy(() => import("../../StandardDocuments/CartingJobRequestGenerator"));
const MovementJobRequestGenerator = lazy(() => import("../../StandardDocuments/MovementJobRequestGenerator"));
const StorageApplicationGenerator = lazy(() => import("../../StandardDocuments/StorageApplicationGenerator"));
const CertificateOfOriginGenerator = lazy(() => import("../../StandardDocuments/CertificateOfOriginGenerator"));

export default function StandardDocumentGeneratorMenu({
  anchorEl,
  genDocsAnchorEl,
  open,
  onClose,
  handleGenDocsClose,
  selectedJob,
  selectedGenDocJob,
  onTrackDocClick,
  handleTrackDocClick,
}) {
  const actualAnchor = anchorEl || genDocsAnchorEl;
  const actualOpen = open !== undefined ? open : Boolean(actualAnchor);
  const actualClose = onClose || handleGenDocsClose;
  const job = selectedJob || selectedGenDocJob;
  const trackClick = onTrackDocClick || handleTrackDocClick || (() => {});

  return (
    <Menu
      anchorEl={actualAnchor}
      open={actualOpen}
      onClose={actualClose}
      PaperProps={{
        style: {
          maxHeight: 350,
          width: '280px',
          overflowY: 'auto',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '4px 0'
        },
      }}
    >
      {job && (() => {
        const isGandhidham =
          String(job?.branch_code || "").toUpperCase().trim() === "GIM" ||
          String(job?.job_no || "").toUpperCase().startsWith("GIM");
        return (
          <Suspense fallback={
            <MenuItem style={{ fontSize: '12px', minHeight: '30px', padding: '4px 12px', color: '#64748b' }}>
              <CircularProgress size={16} sx={{ mr: 1 }} /> Loading generators...
            </MenuItem>
          }>
            <ListSubheader style={{
              lineHeight: '22px',
              backgroundColor: '#f1f5f9',
              color: '#1e293b',
              fontWeight: '800',
              fontSize: '10px',
              textTransform: 'uppercase',
              borderBottom: '1px solid #e2e8f0',
              letterSpacing: '0.05em'
            }}>
            </ListSubheader>

            <ExportChecklistGenerator jobNo={job?.job_no} renderAsIcon={false} onTrackSuccess={(clicks) => trackClick(job.job_no, "checklist", clicks)}>
              <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>CHECKLIST</MenuItem>
            </ExportChecklistGenerator>

            <FileCoverGenerator jobNo={job?.job_no} onTrackSuccess={(clicks) => trackClick(job.job_no, "file_cover", clicks)}>
              <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FILE COVER</MenuItem>
            </FileCoverGenerator>

            {(job?.custom_house?.toUpperCase().includes("SACHANA")) && (
              <ConsignmentNoteGenerator jobNo={job?.job_no}>
                <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FORWARDING NOTE (SACHANA)</MenuItem>
              </ConsignmentNoteGenerator>
            )}

            {(job?.custom_house?.toUpperCase().includes("THAR")) && (
              <ForwardingNoteTharGenerator jobNo={job?.job_no}>
                <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FORWARDING NOTE (THAR)</MenuItem>
              </ForwardingNoteTharGenerator>
            )}

            {(job?.custom_house?.toUpperCase().includes("SABARMATI") || job?.custom_house?.toUpperCase().includes("CONCOR")) && (
              <ConcorForwardingNoteGenerator jobNo={job?.job_no}>
                <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>FORWARDING NOTE (CONCOR)</MenuItem>
              </ConcorForwardingNoteGenerator>
            )}

            {(job?.custom_house?.toUpperCase().includes("SABARMATI")) && (
              <ConcorPltLetterGenerator jobNo={job?.job_no}>
                <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>CONCOR PLT LETTER</MenuItem>
              </ConcorPltLetterGenerator>
            )}

            {(job?.custom_house?.toUpperCase().includes("SANAND") ||
              job?.custom_house?.toUpperCase().includes("THAR") ||
              job?.custom_house?.toUpperCase().includes("ICD")) && (
                <AnnexureDGenerator jobNo={job?.job_no}>
                  <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>ANNEXURE D</MenuItem>
                </AnnexureDGenerator>
              )}

            {(!job?.custom_house?.toUpperCase().includes("ACC") &&
              !job?.custom_house?.toUpperCase().includes("AIRPORT") &&
              !job?.custom_house?.toUpperCase().includes("AIR CARGO") &&
              job?.transportMode !== "AIR") && (
                <>
                  <AnnexureCGenerator jobNo={job?.job_no}>
                    <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>ANNEXURE C</MenuItem>
                  </AnnexureCGenerator>
                  <VGMAuthorizationGenerator jobNo={job?.job_no}>
                    <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>VGM AUTHORIZATION</MenuItem>
                  </VGMAuthorizationGenerator>
                  <BillOfLadingGenerator jobNo={job?.job_no}>
                    <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>BILL OF LADING</MenuItem>
                  </BillOfLadingGenerator>
                  <CertificateOfOriginGenerator jobNo={job?.job_no}>
                    <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>CERTIFICATE OF ORIGIN</MenuItem>
                  </CertificateOfOriginGenerator>
                </>
              )}

            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (!job) return;
                const downloadUrl = `${import.meta.env.VITE_API_STRING}/generate-sb-file/${job._id}`;
                window.open(downloadUrl, "_blank");
              }}
              style={{
                fontSize: '12px',
                minHeight: '34px',
                padding: '4px 12px',
                color: '#166534',
                fontWeight: 'bold',
                backgroundColor: '#f0fdf4',
                borderBottom: '2px solid #bbf7d0'
              }}
            >
              EXPORT SB FLAT FILE (.SB)
            </MenuItem>

            {isGandhidham && (
              <>
                <StuffingJobRequestGenerator jobNo={job?.job_no}>
                  <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>
                    STUFFING JOB REQUEST
                  </MenuItem>
                </StuffingJobRequestGenerator>

                <ImportContainerDeliveryOrderGenerator jobNo={job?.job_no}>
                  <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>
                    IMPORT CONTAINER DELIVERY ORDER
                  </MenuItem>
                </ImportContainerDeliveryOrderGenerator>

                <BufferContainerGateInToCfsGenerator jobNo={job?.job_no}>
                  <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>
                    BUFFER CONTAINER GATE IN TO CFS
                  </MenuItem>
                </BufferContainerGateInToCfsGenerator>

                <CartingJobRequestGenerator jobNo={job?.job_no}>
                  <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>
                    CARTING JOB REQUEST
                  </MenuItem>
                </CartingJobRequestGenerator>

                <MovementJobRequestGenerator jobNo={job?.job_no}>
                  <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>
                    MOVEMENT JOB REQUEST
                  </MenuItem>
                </MovementJobRequestGenerator>

                <StorageApplicationGenerator jobNo={job?.job_no}>
                  <MenuItem style={{ fontSize: '12px', minHeight: '30px', borderBottom: '1px solid #f1f5f9', padding: '4px 12px', fontWeight: '600' }}>
                    STORAGE YARD APPLICATION
                  </MenuItem>
                </StorageApplicationGenerator>
              </>
            )}
          </Suspense>
        );
      })()}
    </Menu>
  );
}
