// src/pages/Supermarket/BillDetailsPage.jsx
import { useState, useEffect, useRef } from "react";
import {
  Box, Grid, Card, CardContent, Typography, TextField, Button,
  Stack, IconButton, Tooltip, InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PrintIcon from "@mui/icons-material/Print";
import DeleteIcon from "@mui/icons-material/Delete";
import { formatCurrency, formatDateTime } from "../../utils/helpers";
import { ConfirmDialog, DataTable, PayChip, Toast } from "../../components/shared";
import { useConfig } from "../../hooks/useConfig";
import { useReactToPrint } from "react-to-print";
import BillSummaryPanel from "../../components/BillSummaryPanel";
import { billService } from "../../api/services";
import { useConfirm } from "../../hooks/useConfirm";

export default function BillDetailsPage() {
  const { config } = useConfig();
  const shopInfo = config?.shop_info || {};
  
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // ✅ NEW STATES
  const [apiBills, setApiBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const printRef = useRef();

  const { confirm, dialogProps } = useConfirm();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleDelete = async () => {
    if (!selected) return;
    console.log("selected" , selected);
    
    const confirmDelete = await confirm(
      `Are you sure you want to delete Bill #${selected.bill_number}?\nThis action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      await billService.delete(selected.id);
      setToast({ open: true, message: "Bill deleted successfully", severity: "success" });
      setSelected(null);
      fetchBills();
    } catch (e) {
      setToast({ open: true, message: `Failed to delete bill: ${e.message || "Unknown error"}`, severity: "error" });
    }
  };

  // ✅ FETCH API
  useEffect(() => {
    fetchBills();
  }, [page, search, fromDate, toDate]);

  const fetchBills = async () => {
    try {
      setLoading(true);

      // ✅ VALIDATE: If toDate is given, fromDate is mandatory
      if (toDate && !fromDate) {
        alert("Please select 'From Date' when using 'To Date'");
        setLoading(false);
        return;
      }

      const params = {
        page,
        per_page: perPage,
      };

      if (search) params.search = search;
      if (fromDate && toDate) {
        params.from = fromDate;
        params.to = toDate;
      } else if (fromDate) {
        params.date = fromDate;
      }

      const res = await billService.list(params);

      // ✅ MAP API → UI FORMAT
      const mapped = res.data.map((b) => ({
        ...b,
        customer: b.customer_name,
        method: b.payment_method,
        grandTotal: b.grand_total,
        datetime: b.created_at,
        sgst: b.total_sgst,
        cgst: b.total_cgst,
        totalDiscount: b.total_discount,
        totalProfit: b.total_profit
      }));

      setApiBills(mapped);
      setTotal(res.meta?.total || 0);

      if (mapped.length > 0 && (!selected || !mapped.some((b) => b.id === selected.id))) {
        setSelected(mapped[0]);
      } else if (mapped.length === 0) {
        setSelected(null);
      }

    } catch (e) {
      console.error("Failed to fetch bills");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      field: "bill_number", label: "Bill ID",
      render: (v) => <Typography variant="body2" fontWeight={700} color="primary.main">{v}</Typography>,
    },
    { field: "customer", label: "Customer" },
    {
      field: "datetime", label: "Date & Time",
      render: (v) => <Typography variant="caption" color="text.secondary">{formatDateTime(v)}</Typography>,
    },
    {
      field: "method", label: "Method",
      render: (v) => <PayChip method={v} />,
    },
    {
      field: "grandTotal", label: "Total", align: "right",
      render: (v) => <Typography variant="body2" fontWeight={700}>{formatCurrency(v)}</Typography>,
    },
  ];

  return (
    <Box>
      <Grid container spacing={2.5}>
        {/* ── Left: Bill List ── */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
                <TextField
                  sx={{ flex: 1, minWidth: 200 }}
                  placeholder="Search by ID or customer name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  type="date"
                  size="small"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  label="From"
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 140 }}
                />

                <TextField
                  type="date"
                  size="small"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  label="To"
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 140 }}
                />

                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearch("");
                    setFromDate("");
                    setToDate("");
                    setPage(1);
                  }}
                >
                  Reset
                </Button>
              </Stack>

              {/* ✅ LOADER */}
              {loading && (
                <Typography variant="caption" color="text.secondary">
                  Loading...
                </Typography>
              )}

              <DataTable
                columns={columns}
                rows={apiBills}
                onRowClick={(row) => setSelected(row)}
                selectedId={selected?.id}
                emptyMessage="No bills found"
              />

              {/* ✅ PAGINATION */}
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </Button>

                <Typography variant="caption">
                  Page {page}
                </Typography>

                <Button
                  disabled={page * perPage >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </Box>

              {apiBills.length > 0 && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">{total} bills found</Typography>
                    <Typography variant="caption" fontWeight={700}>
                      Total: {formatCurrency(apiBills.reduce((s, b) => s + (b.grandTotal || 0), 0))}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Bill Summary ── */}
        <Grid item xs={12} lg={5}>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle1" fontWeight={700}>Bill Summary</Typography>
              {selected && (
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Print">
                    <IconButton size="small" onClick={handlePrint} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                      <PrintIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={handleDelete} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5 }} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Stack>

            {selected ? (
              <BillSummaryPanel bill={selected} shopInfo={shopInfo} ref={printRef} />
            ) : (
              <Card>
                <CardContent sx={{ textAlign: "center", py: 6 }}>
                  <Typography color="text.secondary" variant="body2">Select a bill to view details</Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}
