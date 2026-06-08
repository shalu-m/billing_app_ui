import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import EggAltOutlinedIcon from "@mui/icons-material/EggAltOutlined";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { calcEggEntry, formatCurrency, formatDate, isWithinLastDays } from "../../utils/helpers";
import { Toast, ConfirmDialog, DataTable } from "../../components/shared";
import { eggService } from "../../api/services";
import { useConfirm } from "../../hooks/useConfirm";

const todayIso = () => new Date().toISOString().split("T")[0];
const emptyLine = () => ({ price_per_egg: "", trays_sold: "", loose_eggs_sold: "", eggs_per_tray: 30, quantity: "" });
const toNumber = (value) => Number(value || 0);
const lineQuantity = (line) => {
  const trays = toNumber(line.trays_sold);
  const looseEggs = toNumber(line.loose_eggs_sold);
  const eggsPerTray = toNumber(line.eggs_per_tray) || 30;

  if (trays > 0 || looseEggs > 0) {
    return Math.round((trays * eggsPerTray) + looseEggs);
  }

  return toNumber(line.quantity);
};

const emptyForm = () => ({
  id: null,
  entry_date: todayIso(),
  opening_stock: 0,
  previous_closing: 0,
  stock_added_to_opening: 0,
  new_stock_today: 0,
  avg_cost_per_egg: 0,
  free_stock: 0,
  damaged_eggs: "0",
  notes: "",
  sale_lines: [{ price_per_egg: "", trays_sold: "", loose_eggs_sold: "", eggs_per_tray: 30, quantity: "" }],
  intake_details: [],
  stock_layers: [],
});

function SummaryTile({ label, value, tone = "default" }) {
  const colors = {
    default: { borderColor: "divider", bgcolor: "grey.50", color: "text.primary" },
    primary: { borderColor: "primary.200", bgcolor: "primary.50", color: "primary.main" },
    success: { borderColor: "success.light", bgcolor: "success.light", color: "success.dark" },
    warning: { borderColor: "warning.light", bgcolor: "warning.light", color: "warning.dark" },
  }[tone];

  return (
    <Box sx={{ border: "1px solid", borderRadius: 2, p: 1.5, ...colors }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
    </Box>
  );
}

function normalizeEntry(entry) {
  const saleLines = Array.isArray(entry.sale_lines) && entry.sale_lines.length > 0
    ? entry.sale_lines.map((line) => {
      const eggsPerTray = Number(line.eggs_per_tray || 30);
      const quantity = Number(line.quantity ?? line.qty ?? 0);
      const traysSold = line.trays_sold ?? (quantity ? Math.floor(quantity / eggsPerTray) : "");
      const looseEggsSold = line.loose_eggs_sold ?? (quantity ? quantity % eggsPerTray : "");

      return {
        price_per_egg: String(line.price_per_egg ?? line.price ?? ""),
        trays_sold: String(traysSold || ""),
        loose_eggs_sold: String(looseEggsSold || ""),
        eggs_per_tray: eggsPerTray,
        quantity: String(quantity || ""),
      };
    })
    : [{
      price_per_egg: String(entry.selling_price ?? ""),
      trays_sold: "",
      loose_eggs_sold: "",
      eggs_per_tray: 30,
      quantity: String(entry.total_eggs_sold ?? entry.eggs_sold ?? ""),
    }];

  const openingStock = entry.opening_stock ?? 0;
  const newStock = entry.new_stock_today ?? entry.fresh_arrivals ?? 0;

  return {
    id: entry.id,
    entry_date: entry.entry_date,
    opening_stock: openingStock,
    previous_closing: Math.max(0, openingStock - newStock),
    stock_added_to_opening: newStock,
    new_stock_today: newStock,
    avg_cost_per_egg: entry.avg_cost_per_egg ?? entry.cost_per_egg ?? 0,
    free_stock: entry.free_stock ?? 0,
    damaged_eggs: String(entry.damaged_eggs ?? 0),
    notes: entry.notes || "",
    sale_lines: saleLines,
    intake_details: [],
    // Keep stock_layers from the entry if present — they will be refreshed
    // by loadOpeningStock, but having them here avoids a blank flash.
    stock_layers: Array.isArray(entry.stock_layers) ? entry.stock_layers : [],
  };
}

const getSaleLines = (entry) => Array.isArray(entry?.sale_lines) ? entry.sale_lines : [];
const getLinePrice = (line) => toNumber(line.price_per_egg ?? line.price);
const getLineQty = (line) => toNumber(line.quantity ?? line.qty);
const getLineAmount = (line) => toNumber(line.total_amount ?? line.amount ?? getLinePrice(line) * getLineQty(line));

function SaleLinesSummary({ lines, onClick }) {
  const count = lines.length;

  return (
    <Tooltip title={count > 0 ? "View sale lines" : "No sale lines"}>
      <span>
        <Button
          size="small"
          variant="text"
          disabled={count === 0}
          onClick={onClick}
          sx={{ minWidth: 32, px: 1, fontWeight: 800 }}
        >
          {count}
        </Button>
      </span>
    </Tooltip>
  );
}

function SaleLinesDetail({ entry, showTitle = true, maxHeight = 260 }) {
  const lines = getSaleLines(entry);

  if (!entry || !lines.length) {
    return <Typography variant="body2" color="text.secondary">No sale lines for this entry.</Typography>;
  }

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "grey.50", p: 1.25 }}>
      {showTitle && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" fontWeight={800}>
            Sale Lines - {formatDate(entry.entry_date)}
          </Typography>
          <Chip size="small" variant="outlined" label={`${lines.length} ${lines.length === 1 ? "line" : "lines"}`} />
        </Stack>
      )}

      <Box sx={{ maxHeight, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(80px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr)",
            gap: 1,
            px: 1,
            py: 0.75,
            bgcolor: "grey.100",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {["Rate", "Trays + Eggs", "Total Eggs", "Amount"].map((heading) => (
            <Typography key={heading} variant="caption" fontWeight={800} color="text.secondary">
              {heading}
            </Typography>
          ))}
        </Box>

        {lines.map((line, index) => (
          <Box
            key={line.id || index}
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(80px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr)",
              gap: 1,
              px: 1,
              py: 0.75,
              borderTop: index === 0 ? 0 : "1px solid",
              borderColor: "divider",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" fontWeight={700}>{formatCurrency(getLinePrice(line))}</Typography>
            <Typography variant="caption">
              {Number(line.trays_sold || 0).toLocaleString("en-IN")} trays + {Number(line.loose_eggs_sold || 0).toLocaleString("en-IN")} eggs
            </Typography>
            <Typography variant="caption">{getLineQty(line).toLocaleString("en-IN")}</Typography>
            <Typography variant="caption" fontWeight={800}>{formatCurrency(getLineAmount(line))}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function EggEntryPage() {
  const [form, setForm] = useState(emptyForm());
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [saleLinesEntry, setSaleLinesEntry] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [historyFilters, setHistoryFilters] = useState({ from: "", to: "" });
  const [errors, setErrors] = useState({});
  const [openingLoading, setOpeningLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [showStockLayers, setShowStockLayers] = useState(false);
  // A counter we can increment to force loadOpeningStock to re-run even when
  // entry_date hasn't changed (e.g. after saving an entry for today).
  const [openingRefreshKey, setOpeningRefreshKey] = useState(0);
  const formRef = useRef(null);
  const { confirm, dialogProps } = useConfirm();
  const perPage = 10;

  const computed = useMemo(() => calcEggEntry(form), [form]);
  const rawClosingStock = toNumber(form.opening_stock) - computed.totalSold - toNumber(form.damaged_eggs);
  const liveCostPerEgg = computed.totalSold > 0
    ? computed.totalCost / computed.totalSold
    : toNumber(form.avg_cost_per_egg);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateSaleLine = (index, field, value) => {
    setForm((current) => ({
      ...current,
      sale_lines: current.sale_lines.map((line, lineIndex) => (
        lineIndex === index ? { ...line, [field]: value } : line
      )),
    }));
  };

  const addSaleLine = () => {
    setForm((current) => ({
      ...current,
      sale_lines: [...current.sale_lines, emptyLine()],
    }));
  };

  const removeSaleLine = (index) => {
    setForm((current) => ({
      ...current,
      sale_lines: current.sale_lines.length === 1
        ? [emptyLine()]
        : current.sale_lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  /**
   * Fetch opening stock for a given date, with an optional ignoreEntryId
   * so that when editing we exclude the current entry from the calculation.
   */
  const loadOpeningStock = useCallback(async (date, ignoreEntryId = null) => {
    if (!date) return;

    try {
      setOpeningLoading(true);
      const params = { date };
      if (ignoreEntryId) params.ignore_entry_id = ignoreEntryId;
      const res = await eggService.openingStock(params);
      setForm((current) => {
        // Guard: only apply if the form date still matches (avoid stale updates)
        if (current.entry_date !== date) return current;

        return {
          ...current,
          opening_stock: res.opening_stock || 0,
          previous_closing: res.previous_closing || 0,
          stock_added_to_opening: res.new_intake || 0,
          new_stock_today: res.today_intake ?? res.new_intake ?? 0,
          avg_cost_per_egg: res.avg_cost_per_egg || 0,
          free_stock: res.free_stock || 0,
          intake_details: res.intake_details || [],
          stock_layers: res.stock_layers || [],
        };
      });
    } catch (error) {
      setToast({ open: true, message: "Failed to calculate opening stock.", severity: "error" });
    } finally {
      setOpeningLoading(false);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      setEntriesLoading(true);
      const params = {
        from: historyFilters.from || undefined,
        to: historyFilters.to || undefined,
        page,
        per_page: perPage,
      };
      const res = await eggService.list(params);
      const rows = res.data || [];
      setEntries(rows);
      if (res.meta) {
        setTotalPages(res.meta.last_page || 1);
        setTotalEntries(res.meta.total || 0);
      }
      setSelectedEntry((current) => rows.find((row) => row.id === current?.id) || rows[0] || null);
      setSaleLinesEntry((current) => rows.find((row) => row.id === current?.id) || null);
    } catch (error) {
      setToast({ open: true, message: "Failed to load egg entries.", severity: "error" });
    } finally {
      setEntriesLoading(false);
    }
  }, [historyFilters.from, historyFilters.to, page]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Re-fetch opening stock whenever date or the refresh counter changes.
  // We read the current entry id from a ref to avoid it being a stale dep.
  const currentEntryIdRef = useRef(null);
  useEffect(() => {
    currentEntryIdRef.current = form.id;
  }, [form.id]);

  useEffect(() => {
    loadOpeningStock(form.entry_date, currentEntryIdRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.entry_date, openingRefreshKey, loadOpeningStock]);

  const validate = () => {
    const nextErrors = {};
    const activeLines = form.sale_lines.filter((line) => (
      line.price_per_egg !== "" ||
      line.trays_sold !== "" ||
      line.loose_eggs_sold !== "" ||
      line.quantity !== ""
    ));

    if (!form.entry_date) nextErrors.entry_date = "Required";
    if (form.id && !isWithinLastDays(form.entry_date, 15)) {
      nextErrors.entry_date = "Edit allowed only for the last 15 days";
    }
    if (!activeLines.length) nextErrors.sale_lines = "Add at least one sale line";
    activeLines.forEach((line) => {
      if (toNumber(line.price_per_egg) <= 0 || lineQuantity(line) <= 0) {
        nextErrors.sale_lines = "Each sale line needs price and trays or eggs";
      }
    });
    if (toNumber(form.damaged_eggs) < 0) nextErrors.damaged_eggs = "Must be 0 or more";
    if (rawClosingStock < 0) nextErrors.stock = "Sold plus damaged eggs are more than opening stock";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    entry_date: form.entry_date,
    damaged_eggs: Number(form.damaged_eggs || 0),
    notes: form.notes || null,
    sale_lines: form.sale_lines
      .filter((line) => line.price_per_egg !== "" || lineQuantity(line) > 0)
      .map((line) => ({
        price_per_egg: Number(line.price_per_egg),
        trays_sold: Number(line.trays_sold || 0),
        loose_eggs_sold: Number(line.loose_eggs_sold || 0),
        eggs_per_tray: Number(line.eggs_per_tray || 30),
        quantity: lineQuantity(line),
      })),
  });

  const resetForm = () => {
    const nextForm = emptyForm();
    setForm(nextForm);
    setErrors({});
    // Bump the refresh key so opening stock reloads for today even if the
    // date field value hasn't changed (same day save scenario).
    setOpeningRefreshKey((k) => k + 1);
  };

  const handleSave = async () => {
    if (!validate()) return;

    const ok = await confirm(form.id ? "Update this egg entry?" : "Save this egg entry?");
    if (!ok) return;

    try {
      const payload = buildPayload();
      if (form.id) {
        await eggService.update(form.id, payload);
      } else {
        await eggService.create(payload);
      }

      setToast({ open: true, message: form.id ? "Egg entry updated." : "Egg entry saved.", severity: "success" });
      resetForm();
      loadEntries();
    } catch (error) {
      setToast({
        open: true,
        message: error.response?.data?.message || "Failed to save egg entry.",
        severity: "error",
      });
    }
  };

  const handleEditEntry = (entry) => {
    if (!isWithinLastDays(entry.entry_date, 15)) {
      setToast({ open: true, message: "Only entries from the last 15 days can be edited.", severity: "warning" });
      return;
    }

    setSelectedEntry(entry);
    const normalized = normalizeEntry(entry);
    setForm(normalized);
    setErrors({});

    // Always force-reload opening stock for the edit date, passing the entry's
    // id so the backend excludes it from the calculation (same as update flow).
    // We call directly here instead of relying on the useEffect so it fires
    // even when the date hasn't changed (e.g. editing today's entry).
    loadOpeningStock(normalized.entry_date, entry.id);

    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleDeleteEntry = async (entry) => {
    if (!isWithinLastDays(entry.entry_date, 15)) {
      setToast({ open: true, message: "Only entries from the last 15 days can be deleted.", severity: "warning" });
      return;
    }

    const ok = await confirm(`Delete entry from ${formatDate(entry.entry_date)}?`);
    if (!ok) return;

    try {
      await eggService.delete(entry.id);
      setToast({ open: true, message: "Egg entry deleted.", severity: "success" });
      if (selectedEntry?.id === entry.id) setSelectedEntry(null);
      if (saleLinesEntry?.id === entry.id) setSaleLinesEntry(null);
      loadEntries();
      resetForm();
    } catch (error) {
      setToast({
        open: true,
        message: error.response?.data?.message || "Failed to delete egg entry.",
        severity: "error",
      });
    }
  };

  const entryColumns = [
    {
      field: "entry_date",
      label: "Date",
      align: "center",
      minWidth: 112,
      cellSx: { whiteSpace: "nowrap" },
      render: (value) => (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ display: "inline-block", minWidth: 92, textAlign: "center", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}
        >
          {formatDate(value)}
        </Typography>
      ),
    },
    { field: "opening_stock", label: "Opening", render: (value) => Number(value).toLocaleString("en-IN") },
    { field: "new_stock_today", label: "New Stock", render: (value) => Number(value).toLocaleString("en-IN") },
    { field: "total_eggs_sold", label: "Sold", render: (value, row) => Number(value ?? row.eggs_sold).toLocaleString("en-IN") },
    {
      field: "sale_lines",
      label: "Sale Lines",
      align: "center",
      render: (value, row) => (
        <SaleLinesSummary
          lines={Array.isArray(value) ? value : []}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedEntry(row);
            setSaleLinesEntry(row);
          }}
        />
      ),
    },
    {
      field: "damaged_eggs",
      label: "Damaged",
      render: (value) => Number(value) > 0
        ? <Chip color="warning" size="small" label={Number(value).toLocaleString("en-IN")} />
        : <Typography variant="caption" color="text.secondary">0</Typography>,
    },
    { field: "closing_stock", label: "Closing", render: (value) => Number(value).toLocaleString("en-IN") },
    { field: "total_revenue", label: "Revenue", render: (value, row) => formatCurrency(value ?? row.revenue) },
    {
      field: "gross_profit",
      label: "Profit",
      align: "right",
      render: (value, row) => {
        const profit = value ?? row.profit;
        return (
          <Typography variant="body2" fontWeight={800} color={Number(profit) >= 0 ? "success.main" : "error.main"}>
            {formatCurrency(profit)}
          </Typography>
        );
      },
    },
    {
      field: "actions",
      label: "",
      align: "right",
      render: (_, row) => {
        if (!isWithinLastDays(row.entry_date, 15)) return null;

        return (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title="Edit">
              <IconButton
                size="small"
                color="primary"
                onClick={(event) => {
                  event.stopPropagation();
                  handleEditEntry(row);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteEntry(row);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];
  const saleLinesDialogCount = getSaleLines(saleLinesEntry).length;

  return (
    <Box>
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7} sx={{ order: { xs: 2, lg: 1 } }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={800}>Entry History</Typography>
                  {entriesLoading && <Typography variant="caption" color="text.secondary">Loading...</Typography>}
                </Stack>

                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <TextField
                    label="From"
                    type="date"
                    size="small"
                    value={historyFilters.from}
                    onChange={(event) => {
                      setHistoryFilters((current) => ({ ...current, from: event.target.value }));
                      setPage(1);
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <TextField
                    label="To"
                    type="date"
                    size="small"
                    value={historyFilters.to}
                    onChange={(event) => {
                      setHistoryFilters((current) => ({ ...current, to: event.target.value }));
                      setPage(1);
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <Button variant="outlined" onClick={() => {
                    setHistoryFilters({ from: "", to: "" });
                    setPage(1);
                  }}>
                    Reset
                  </Button>
                </Stack>

                <DataTable
                  columns={entryColumns}
                  rows={entries}
                  onRowClick={(row) => setSelectedEntry(row)}
                  selectedId={selectedEntry?.id}
                  emptyMessage="No egg entries yet."
                />

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary">{totalEntries} entries found</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                      Prev
                    </Button>
                    <Typography variant="caption">Page {page} of {totalPages || 1}</Typography>
                    <Button size="small" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                      Next
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5} sx={{ order: { xs: 1, lg: 2 } }}>
          <Card ref={formRef}>
            <CardContent>
              <Stack spacing={2.2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={800}>
                    {form.id ? "Edit Daily Entry" : "Add Daily Entry"}
                  </Typography>
                  {form.id && <Chip size="small" color="primary" variant="outlined" label="Editing" />}
                </Stack>

                <TextField
                  label="Entry Date"
                  type="date"
                  value={form.entry_date}
                  onChange={setField("entry_date")}
                  error={Boolean(errors.entry_date)}
                  helperText={errors.entry_date}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />

                <TextField
                  label="Opening Stock"
                  value={Number(form.opening_stock || 0).toLocaleString("en-IN")}
                  InputProps={{
                    readOnly: true,
                    endAdornment: <InputAdornment position="end">eggs</InputAdornment>,
                  }}
                  helperText={
                    openingLoading
                      ? "Calculating..."
                      : `${Number(form.previous_closing || 0).toLocaleString("en-IN")} previous + ${Number(form.stock_added_to_opening || 0).toLocaleString("en-IN")} stock arrivals`
                  }
                  fullWidth
                />

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <SummaryTile label="New Stock Today" value={`${Number(form.new_stock_today || 0).toLocaleString("en-IN")} eggs`} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <SummaryTile
                      label="Free Stock"
                      value={`${Number(form.free_stock || 0).toLocaleString("en-IN")} eggs`}
                      tone={Number(form.free_stock) > 0 ? "success" : "default"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <SummaryTile label="FIFO Cost/Egg" value={formatCurrency(liveCostPerEgg, 4)} />
                  </Grid>
                </Grid>

                {Array.isArray(form.stock_layers) && form.stock_layers.length > 0 && (
                  <Box>
                    <Button
                      fullWidth
                      size="small"
                      endIcon={<ExpandMoreIcon sx={{ transform: showStockLayers ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }} />}
                      onClick={() => setShowStockLayers(!showStockLayers)}
                      sx={{ justifyContent: "space-between", textAlign: "left" }}
                    >
                      Stock Breakdown (FIFO Layers)
                    </Button>
                    <Collapse in={showStockLayers}>
                      <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1, border: "1px solid", borderColor: "divider", mt: 1 }}>
                        <Stack spacing={1}>
                          {form.stock_layers.map((layer, index) => {
                            const purchasedQty = Number(layer.purchased_qty || 0);
                            const freeQty = Number(layer.free_qty || 0);
                            const totalEggsInLayer = purchasedQty + freeQty;
                            const layerAmount = purchasedQty * Number(layer.cost_per_egg || 0);

                            return (
                              <Box key={`${layer.intake_id}-${index}`} sx={{ p: 1, bgcolor: "white", borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                  Layer {index + 1} — {formatDate(layer.intake_date)}
                                </Typography>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.5}>
                                  <Typography variant="body2">
                                    {totalEggsInLayer.toLocaleString("en-IN")} eggs
                                    {freeQty > 0 && (
                                      <Typography component="span" variant="caption" sx={{ ml: 0.5, color: "success.dark", fontWeight: 600 }}>
                                        ({freeQty.toLocaleString("en-IN")} free)
                                      </Typography>
                                    )}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={700}>
                                    @ {formatCurrency(layer.cost_per_egg, 4)} = {formatCurrency(layerAmount)}
                                  </Typography>
                                </Stack>
                              </Box>
                            );
                          })}
                          <Box sx={{ p: 1, bgcolor: "primary.50", borderRadius: 1, border: "2px solid", borderColor: "primary.200" }}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" fontWeight={800}>
                                Total: {Number(form.stock_layers.reduce((sum, l) => sum + Number(l.purchased_qty || 0) + Number(l.free_qty || 0), 0)).toLocaleString("en-IN")} eggs
                              </Typography>
                              <Typography variant="body2" fontWeight={800}>
                                {formatCurrency(form.stock_layers.reduce((sum, l) => sum + (Number(l.purchased_qty || 0) * Number(l.cost_per_egg || 0)), 0))}
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>
                      </Box>
                    </Collapse>
                  </Box>
                )}

                <Divider />

                <Stack spacing={1.25}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={800}>Sale Lines</Typography>
                    <Button size="small" startIcon={<AddCircleIcon />} onClick={addSaleLine}>
                      Add Row
                    </Button>
                  </Stack>

                  {form.sale_lines.map((line, index) => {
                    const quantity = lineQuantity(line);
                    const amount = toNumber(line.price_per_egg) * quantity;
                    return (
                      <Grid container spacing={1} alignItems="center" key={index}>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            label="Price/Egg"
                            type="number"
                            value={line.price_per_egg}
                            onChange={(event) => updateSaleLine(index, "price_per_egg", event.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                            InputProps={{ startAdornment: <InputAdornment position="start">Rs</InputAdornment> }}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={4} sm={2}>
                          <TextField
                            label="Trays"
                            type="number"
                            value={line.trays_sold}
                            onChange={(event) => updateSaleLine(index, "trays_sold", event.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={4} sm={2}>
                          <TextField
                            label="Eggs"
                            type="number"
                            value={line.loose_eggs_sold}
                            onChange={(event) => updateSaleLine(index, "loose_eggs_sold", event.target.value)}
                            inputProps={{ min: 0, step: 1 }}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={4} sm={2}>
                          <TextField
                            label="Total"
                            value={quantity.toLocaleString("en-IN")}
                            InputProps={{ readOnly: true }}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={10} sm={2}>
                          <Typography variant="body2" fontWeight={800} textAlign="right">
                            {formatCurrency(amount)}
                          </Typography>
                        </Grid>
                        <Grid item xs={2} sm={1}>
                          <Tooltip title="Remove row">
                            <IconButton size="small" color="error" onClick={() => removeSaleLine(index)}>
                              <RemoveCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Grid>
                      </Grid>
                    );
                  })}

                  {errors.sale_lines && <Alert severity="error">{errors.sale_lines}</Alert>}
                </Stack>

                <TextField
                  label="Damaged Eggs"
                  type="number"
                  value={form.damaged_eggs}
                  onChange={setField("damaged_eggs")}
                  error={Boolean(errors.damaged_eggs)}
                  helperText={errors.damaged_eggs}
                  inputProps={{ min: 0, step: 1 }}
                  InputProps={{ endAdornment: <InputAdornment position="end">eggs</InputAdornment> }}
                  fullWidth
                />

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <SummaryTile label="Total Sold" value={`${computed.totalSold.toLocaleString("en-IN")} eggs`} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <SummaryTile label="Revenue" value={formatCurrency(computed.revenue)} tone="success" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <SummaryTile label="Closing Stock" value={`${Math.max(0, rawClosingStock).toLocaleString("en-IN")} eggs`} tone={rawClosingStock < 0 ? "warning" : "primary"} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <SummaryTile label="Cost of Sold" value={formatCurrency(computed.totalCost)} />
                  </Grid>
                  <Grid item xs={12}>
                    <SummaryTile label="Profit" value={formatCurrency(computed.profit)} tone={computed.profit >= 0 ? "primary" : "warning"} />
                  </Grid>
                </Grid>

                {errors.stock && (
                  <Alert severity="error" icon={<WarningAmberIcon />}>
                    {errors.stock}
                  </Alert>
                )}

                {computed.profit < 0 && !errors.stock && (
                  <Alert severity="warning" icon={<WarningAmberIcon />}>
                    Profit is negative for the current rates and cost.
                  </Alert>
                )}

                <TextField
                  label="Notes"
                  value={form.notes}
                  onChange={setField("notes")}
                  minRows={2}
                  multiline
                  fullWidth
                />

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    sx={{ flex: 1, fontWeight: 800 }}
                  >
                    {form.id ? "Update Entry" : "Save Entry"}
                  </Button>
                  <Button variant="outlined" size="large" onClick={resetForm}>
                    Reset
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={Boolean(saleLinesEntry)}
        onClose={() => setSaleLinesEntry(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>Sale Lines</Typography>
              <Typography variant="caption" color="text.secondary">
                {saleLinesEntry ? formatDate(saleLinesEntry.entry_date) : ""}
              </Typography>
            </Box>
            <Chip
              size="small"
              variant="outlined"
              label={`${saleLinesDialogCount} ${saleLinesDialogCount === 1 ? "line" : "lines"}`}
            />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <SaleLinesDetail entry={saleLinesEntry} showTitle={false} maxHeight={360} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaleLinesEntry(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={() => setToast((current) => ({ ...current, open: false }))} />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}