// src/components/shared.jsx
import {
  Box, Card, CardContent, Typography, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Snackbar, Alert, Paper, Dialog, DialogContent, DialogActions, Button
} from "@mui/material";
import { formatCurrency } from "../utils/helpers";

// ── Stat Card ──────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = "primary.main", bgcolor = "primary.light" }) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing="0.06em">
            {label}
          </Typography>
          <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor, display: "flex", alignItems: "center", justifyContent: "center", color }}>
            {icon}
          </Box>
        </Stack>
        <Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ── Section Card ────────────────────────────────────────────────────────────
export function SectionCard({ title, subtitle, action, children, sx = {} }) {
  return (
    <Card sx={sx}>
      {(title || action) && (
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            {title && <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>}
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          {action}
        </Box>
      )}
      <CardContent sx={{ pt: title ? 0 : 2 }}>{children}</CardContent>
    </Card>
  );
}

// ── Data Table ──────────────────────────────────────────────────────────────
export function DataTable({ columns, rows, onRowClick, emptyMessage = "No data available", selectedId }) {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.field} align={col.align || "left"} sx={{ whiteSpace: "nowrap" }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: "text.secondary" }}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <TableRow
                key={row.id || i}
                onClick={() => onRowClick && onRowClick(row)}
                sx={{
                  cursor: onRowClick ? "pointer" : "default",
                  bgcolor: selectedId && selectedId === row.id ? "primary.50" : "inherit",
                  "&:hover": { bgcolor: onRowClick ? "action.hover" : "inherit" },
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.field} align={col.align || "left"} sx={{ py: 1.25 }}>
                    {col.render ? col.render(row[col.field], row) : row[col.field]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Payment Method Chip ─────────────────────────────────────────────────────
export function PayChip({ method }) {
  const map = { Cash: "success", UPI: "info", Card: "warning" };
  return <Chip label={method} color={map[method] || "default"} size="small" variant="outlined" />;
}

// ── Currency Display ────────────────────────────────────────────────────────
export function Currency({ value, variant = "body2", fontWeight = 500, color }) {
  return (
    <Typography variant={variant} fontWeight={fontWeight} color={color} sx={{ fontVariantNumeric: "tabular-nums" }}>
      {formatCurrency(value)}
    </Typography>
  );
}

// ── Toast Notification ──────────────────────────────────────────────────────
export function Toast({ open, message, severity = "success", onClose }) {
  return (
    <Snackbar open={open} autoHideDuration={3000} onClose={onClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
      <Alert severity={severity} variant="filled" onClose={onClose} sx={{ borderRadius: 2 }}>
        {message}
      </Alert>
    </Snackbar>
  );
}

export function ConfirmDialog({ open, message, onConfirm, onCancel, confirmText = "Yes, confirm", cancelText = "Cancel" }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogContent>
        <Typography variant="subtitle1" fontWeight={500} mb={1}>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button fullWidth variant="outlined" color="inherit" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button fullWidth variant="contained" onClick={onConfirm}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

