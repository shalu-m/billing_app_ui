import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EggOutlinedIcon from "@mui/icons-material/EggOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import { eggService } from "../../api/services";
import { Toast, ConfirmDialog, DataTable, StatCard } from "../../components/shared";
import { formatCurrency, formatDate, isWithinLastDays } from "../../utils/helpers";
import { useConfirm } from "../../hooks/useConfirm";

const todayIso = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  intake_date: todayIso(),
  trays_received: "",
  loose_eggs_received: "",
  eggs_per_tray: 30,
  cost_per_tray: "",
  supplier_name: "",
  notes: "",
});

const isAllowedIntakeDay = (date) => {
  if (!date) return false;
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 1 || day === 4;
};

const toNumber = (value) => Number(value || 0);

export default function EggIntakePage() {
  const [form, setForm] = useState(emptyForm());
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [intakes, setIntakes] = useState([]);
  const [totals, setTotals] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const { confirm, dialogProps } = useConfirm();

  const preview = useMemo(() => {
    const trays = toNumber(form.trays_received);
    const looseEggs = toNumber(form.loose_eggs_received);
    const eggsPerTray = toNumber(form.eggs_per_tray);
    const costPerTray = toNumber(form.cost_per_tray);
    const costPerEgg = eggsPerTray > 0 ? costPerTray / eggsPerTray : 0;
    const totalEggs = Math.round((trays * eggsPerTray) + looseEggs);
    const totalCost = (trays * costPerTray) + (looseEggs * costPerEgg);

    return {
      totalEggs,
      totalCost,
      costPerEgg,
    };
  }, [form]);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const loadIntakes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await eggService.listIntakes({
        from: filters.from || undefined,
        to: filters.to || undefined,
        per_page: 50,
      });
      setIntakes(res.data || []);
      setTotals(res.totals || {});
    } catch (error) {
      setToast({ open: true, message: "Failed to load egg intakes.", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.to]);

  useEffect(() => {
    loadIntakes();
  }, [loadIntakes]);

  const validate = () => {
    const nextErrors = {};

    if (!form.intake_date) nextErrors.intake_date = "Required";
    if (toNumber(form.trays_received) <= 0 && toNumber(form.loose_eggs_received) <= 0) {
      nextErrors.trays_received = "Enter trays or loose eggs";
      nextErrors.loose_eggs_received = "Enter trays or loose eggs";
    }
    if (toNumber(form.loose_eggs_received) < 0) nextErrors.loose_eggs_received = "Must be 0 or more";
    if (!form.eggs_per_tray || toNumber(form.eggs_per_tray) <= 0) nextErrors.eggs_per_tray = "Required";
    if (!form.cost_per_tray || toNumber(form.cost_per_tray) <= 0) nextErrors.cost_per_tray = "Required";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const ok = await confirm("Record this egg stock intake?");
    if (!ok) return;

    try {
      await eggService.createIntake({
        intake_date: form.intake_date,
        trays_received: Number(form.trays_received),
        loose_eggs_received: Number(form.loose_eggs_received || 0),
        eggs_per_tray: Number(form.eggs_per_tray),
        cost_per_tray: Number(form.cost_per_tray),
        supplier_name: form.supplier_name || null,
        notes: form.notes || null,
      });
      setToast({ open: true, message: "Egg stock intake recorded.", severity: "success" });
      setForm(emptyForm());
      setErrors({});
      loadIntakes();
    } catch (error) {
      setToast({
        open: true,
        message: error.response?.data?.message || "Failed to record egg intake.",
        severity: "error",
      });
    }
  };

  const handleDelete = async (intake) => {
    if (!isWithinLastDays(intake.intake_date, 5)) {
      setToast({ open: true, message: "Only intakes from the last 5 days can be deleted.", severity: "warning" });
      return;
    }

    const ok = await confirm(`Delete intake from ${formatDate(intake.intake_date)}?`);
    if (!ok) return;

    try {
      await eggService.deleteIntake(intake.id);
      setToast({ open: true, message: "Egg stock intake deleted.", severity: "success" });
      loadIntakes();
    } catch (error) {
      setToast({
        open: true,
        message: error.response?.data?.message || "Failed to delete egg intake.",
        severity: "error",
      });
    }
  };

  const intakeColumns = [
    { field: "intake_date", label: "Date", render: (value) => <Typography variant="body2" fontWeight={700}>{formatDate(value)}</Typography> },
    { field: "trays_received", label: "Trays", render: (value) => Number(value).toLocaleString("en-IN") },
    { field: "loose_eggs_received", label: "Loose Eggs", render: (value) => Number(value || 0).toLocaleString("en-IN") },
    { field: "eggs_per_tray", label: "Eggs/Tray" },
    { field: "total_eggs", label: "Total Eggs", render: (value) => Number(value).toLocaleString("en-IN") },
    { field: "cost_per_tray", label: "Cost/Tray", render: (value) => formatCurrency(value) },
    { field: "total_cost", label: "Total Cost", render: (value) => formatCurrency(value) },
    { field: "cost_per_egg", label: "Cost/Egg", render: (value) => formatCurrency(value, 4) },
    {
      field: "actions",
      label: "",
      align: "right",
      render: (_, row) => {
        if (!isWithinLastDays(row.intake_date, 5)) return null;

        return (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(row);
            }}
          >
            Delete
          </Button>
        );
      },
    },
  ];

  return (
    <Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <TextField
                    label="From"
                    type="date"
                    size="small"
                    value={filters.from}
                    onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <TextField
                    label="To"
                    type="date"
                    size="small"
                    value={filters.to}
                    onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <Button variant="outlined" onClick={() => setFilters({ from: "", to: "" })}>
                    Reset
                  </Button>
                </Stack>

                {loading && <Typography variant="caption" color="text.secondary">Loading...</Typography>}

                <DataTable
                  columns={intakeColumns}
                  rows={intakes}
                  emptyMessage="No egg intakes found."
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Stack spacing={2.2}>
                <Typography variant="subtitle1" fontWeight={800}>
                  Record Intake
                </Typography>

                <TextField
                  label="Date"
                  type="date"
                  value={form.intake_date}
                  onChange={setField("intake_date")}
                  error={Boolean(errors.intake_date)}
                  helperText={errors.intake_date}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Trays"
                      type="number"
                      value={form.trays_received}
                      onChange={setField("trays_received")}
                      error={Boolean(errors.trays_received)}
                      helperText={errors.trays_received}
                      inputProps={{ min: 0, step: 0.01 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Loose Eggs"
                      type="number"
                      value={form.loose_eggs_received}
                      onChange={setField("loose_eggs_received")}
                      error={Boolean(errors.loose_eggs_received)}
                      helperText={errors.loose_eggs_received}
                      inputProps={{ min: 0, step: 1 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Eggs/Tray"
                      type="number"
                      value={form.eggs_per_tray}
                      onChange={setField("eggs_per_tray")}
                      error={Boolean(errors.eggs_per_tray)}
                      helperText={errors.eggs_per_tray}
                      inputProps={{ min: 1, step: 1 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Cost/Tray"
                      type="number"
                      value={form.cost_per_tray}
                      onChange={setField("cost_per_tray")}
                      error={Boolean(errors.cost_per_tray)}
                      helperText={errors.cost_per_tray}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{ startAdornment: <InputAdornment position="start">Rs</InputAdornment> }}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>Total Eggs</Typography>
                      <Typography variant="h6" fontWeight={800}>{preview.totalEggs.toLocaleString("en-IN")}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>Total Cost</Typography>
                      <Typography variant="h6" fontWeight={800}>{formatCurrency(preview.totalCost)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>Cost/Egg</Typography>
                      <Typography variant="h6" fontWeight={800}>{formatCurrency(preview.costPerEgg, 4)}</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <TextField
                  label="Supplier Name"
                  value={form.supplier_name}
                  onChange={setField("supplier_name")}
                  fullWidth
                />
                <TextField
                  label="Notes"
                  value={form.notes}
                  onChange={setField("notes")}
                  minRows={3}
                  multiline
                  fullWidth
                />

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddCircleIcon />}
                  onClick={handleSave}
                  sx={{ fontWeight: 800 }}
                >
                  Record Intake
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={() => setToast((current) => ({ ...current, open: false }))} />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}


