// src/pages/EggTracking/EggEntryPage.jsx
import { useEffect, useState, useRef } from "react";
import {
  Box, Grid, Card, CardContent, Typography, TextField, Button,
  Stack, InputAdornment, Chip, Alert, Divider,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import EggAltOutlinedIcon from "@mui/icons-material/EggAltOutlined";
import { calcEggEntry, formatCurrency, formatDate } from "../../utils/helpers";
import { Toast, ConfirmDialog } from "../../components/shared";
import { eggService } from "../../api/services";
import { useConfirm } from "../../hooks/useConfirm";

const EMPTY_FORM = {
  entry_date: new Date().toISOString().split("T")[0],
  opening_stock: "",
  fresh_arrivals: "",
  eggs_sold: "",
  damaged_eggs: "",
  cost_per_egg: "",
  selling_price: "",
};

// Computed display card
function ComputedCard({ label, value, color = "default", highlight = false }) {
  return (
    <Box sx={{
      borderRadius: 2, p: 2,
      border: "1px solid",
      borderColor: highlight ? "primary.200" : "divider",
      bgcolor: highlight ? "primary.50" : "grey.50",
    }}>
      <Typography variant="caption" color={highlight ? "primary.main" : "text.secondary"} fontWeight={600} textTransform="uppercase" letterSpacing="0.05em">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={800} color={highlight ? "primary.main" : "text.primary"} sx={{ fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function EggEntryPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [entries, setEntries] = useState([]);
  const today = new Date().toISOString().split("T")[0];
  const isEditingToday = form.entry_date === today;

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const formRef = useRef(null);
  const openingStockRef = useRef(null);
  const freshArrivalsRef = useRef(null);
  const eggsSoldRef = useRef(null);
  const damagedEggsRef = useRef(null);
  const costPerEggRef = useRef(null);
  const sellingPriceRef = useRef(null);

  const { confirm, dialogProps } = useConfirm();

  // Live computed values
  const computed = calcEggEntry(form);

  const validate = () => {
    const e = {};
    if (!form.entry_date) e.entry_date = "Required";
    if (!form.eggs_sold || +form.eggs_sold < 0) e.eggs_sold = "Required";
    if (!form.cost_per_egg || +form.cost_per_egg <= 0) e.cost_per_egg = "Required";
    if (!form.selling_price || +form.selling_price <= 0) e.selling_price = "Required";
    if (+form.selling_price < +form.cost_per_egg) e.selling_price = "Must be ≥ cost";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    laterstEnteries();
  }, []);

  const handleSave = async () => {
    if (!validate()) return;
    const ok = await confirm(`Are you sure you want to save?`);
    if (!ok) return;
    if (form.id) {
      updateEggEntry(form.id, form);
    } else {
      addEggEntry(form);
    }
  };

  const addEggEntry = async(entry) => {
    try {
      await eggService.create(entry);
      setToast({ open: true, message: "Entry saved successfully!", severity: "success" });
      setForm(EMPTY_FORM);
      setErrors({});
      laterstEnteries();
    } catch (error) {
      setToast({ open: true, message: "Failed to save entry.", severity: "error" });
    }
  };

  const updateEggEntry = async(id, entry) => {
    try {
      await eggService.update(id, entry);
      setToast({ open: true, message: "Entry updated successfully!", severity: "success" });
      setForm(EMPTY_FORM);
      setErrors({});
      laterstEnteries();
    } catch (error) {
      setToast({ open: true, message: "Failed to update entry.", severity: "error" });
    }
  };

  const laterstEnteries = async(entry) => {
    try {
      const payload = {
        page: 1,
        per_page: 5
      }
      const res = await eggService.list(payload);
      setEntries(res.data);
      // const today = new Date().toISOString().split("T")[0];
      // const todayEntry = res.data.find(e => e.entry_date === today);
      // setForm(todayEntry || EMPTY_FORM);
    } catch (error) {
      console.error("Failed to fetch egg entries");
    }
  };

  const handleEditEntry = (entry) => {
    setForm(entry);
    setErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      openingStockRef.current?.focus();
    }, 100);
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const pcsAdorn = (pos) => <InputAdornment position={pos}><Typography variant="caption" color="text.secondary">pcs</Typography></InputAdornment>;
  const inrAdorn = (pos) => <InputAdornment position={pos}><Typography variant="caption" color="text.secondary">INR</Typography></InputAdornment>;

  return (
    <Box>
      <Grid container spacing={2.5}>
        {/* ── Left: Entry Form ── */}
        <Grid item xs={12} lg={7}>
          <Card ref={formRef}>
            <CardContent>
              <Stack spacing={2.5}>
                {/* Date */}
                <Box>
                  <TextField
                    label="Entry Date"
                    type="date"
                    value={form.entry_date}
                    onChange={setField("entry_date")}
                    error={!!errors.entry_date}
                    helperText={errors.entry_date || ""}
                    disabled={form.id !== undefined && !isEditingToday}
                    InputLabelProps={{ shrink: true }}
                    sx={{ maxWidth: 240 }}
                  />
                </Box>

                <Divider />

                {!isEditingToday && form.id && (
                  <Alert severity="info">
                    You can only edit today's entry.
                  </Alert>
                )}

                {/* Stock inputs */}
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Opening Stock"
                      type="number" inputProps={{ min: 0 }}
                      inputRef={openingStockRef}
                      onKeyDown={(e) => e.key === "Enter" && freshArrivalsRef.current?.focus()}
                      value={form.opening_stock}
                      onChange={setField("opening_stock")}
                      disabled={!isEditingToday && form.id !== undefined}
                      InputProps={{ endAdornment: pcsAdorn("end") }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Fresh Arrivals"
                      type="number" inputProps={{ min: 0 }}
                      inputRef={freshArrivalsRef}
                      onKeyDown={(e) => e.key === "Enter" && eggsSoldRef.current?.focus()}
                      value={form.fresh_arrivals}
                      onChange={setField("fresh_arrivals")}
                      disabled={!isEditingToday && form.id !== undefined}
                      InputProps={{ endAdornment: pcsAdorn("end") }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Eggs Sold *"
                      type="number" inputProps={{ min: 0 }}
                      inputRef={eggsSoldRef}
                      onKeyDown={(e) => e.key === "Enter" && damagedEggsRef.current?.focus()}
                      value={form.eggs_sold}
                      onChange={setField("eggs_sold")}
                      error={!!errors.eggs_sold} helperText={errors.eggs_sold}
                      disabled={!isEditingToday && form.id !== undefined}
                      InputProps={{ endAdornment: pcsAdorn("end") }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={
                        <Stack direction="row" alignItems="center" spacing={0.5} component="span">
                          <WarningAmberIcon sx={{ fontSize: 14, color: "warning.main" }} />
                          <span>Damaged Eggs</span>
                        </Stack>
                      }
                      type="number" inputProps={{ min: 0 }}
                      inputRef={damagedEggsRef}
                      onKeyDown={(e) => e.key === "Enter" && costPerEggRef.current?.focus()}
                      value={form.damaged_eggs}
                      onChange={setField("damaged_eggs")}
                      disabled={!isEditingToday && form.id !== undefined}
                      InputProps={{ endAdornment: pcsAdorn("end") }}            
                      sx={{ "& .MuiOutlinedInput-root": { borderColor: form.damaged_eggs > 0 ? "warning.main" : undefined } }}
                    />
                  </Grid>
                </Grid>

                <Divider />

                {/* Pricing */}
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Cost Per Egg *"
                      type="number" inputProps={{ min: 0, step: 0.1 }}
                      inputRef={costPerEggRef}
                      onKeyDown={(e) => e.key === "Enter" && sellingPriceRef.current?.focus()}
                      value={form.cost_per_egg}
                      onChange={setField("cost_per_egg")}
                      error={!!errors.cost_per_egg} helperText={errors.cost_per_egg}
                      disabled={!isEditingToday && form.id !== undefined}
                      InputProps={{ endAdornment: inrAdorn("end") }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Selling Price Per Egg *"
                      type="number" inputProps={{ min: 0, step: 0.1 }}
                      inputRef={sellingPriceRef}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      value={form.selling_price}
                      onChange={setField("selling_price")}
                      error={!!errors.selling_price} helperText={errors.selling_price}
                      disabled={!isEditingToday && form.id !== undefined}
                      InputProps={{ endAdornment: inrAdorn("end") }}
                    />
                  </Grid>
                </Grid>

                <Divider />

                {/* Computed Results */}
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <ComputedCard label="Closing Stock" value={`${computed.closingStock.toLocaleString()} pcs`} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <ComputedCard label="Revenue" value={formatCurrency(computed.revenue)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <ComputedCard
                      label="Net Profit"
                      value={formatCurrency(computed.profit)}
                      highlight
                    />
                  </Grid>
                </Grid>

                {computed.profit < 0 && (
                  <Alert severity="warning" icon={<WarningAmberIcon />}>
                    Negative profit — check your cost and selling price
                  </Alert>
                )}

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={!isEditingToday && form.id !== undefined}
                    sx={{ px: 4, py: 1.2, fontWeight: 700 }}
                  >
                    {form.id ? "Update Entry" : "Save Entry"}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleReset}
                    sx={{ px: 4, py: 1.2, fontWeight: 700 }}
                  >
                    Reset
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Recent History ── */}
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Recent Histories</Typography>

              {entries.length === 0 ? (
                <Box textAlign="center" py={4} color="text.secondary">
                  <EggAltOutlinedIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                  <Typography variant="body2">No entries yet</Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {entries.slice(0, 7).map((e, i) => {
                    const isToday = e.entry_date === today;
                    return (
                    <Box key={e.id || i} sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: i === 0 ? "primary.50" : "background.paper" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="body2" fontWeight={700} color={i === 0 ? "primary.main" : "text.primary"}>
                            {formatDate(e.entry_date)} {isToday && <Chip label="Today" size="small" variant="outlined" sx={{ ml: 1 }} />}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Sold: {e.eggs_sold} pcs
                            {e.damaged_eggs > 0 && ` · Damaged: ${e.damaged_eggs}`}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Stack spacing={0.5} alignItems="flex-end">
                            <Typography variant="body2" fontWeight={800} color="success.main">
                              {formatCurrency(e.profit)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">profit</Typography>
                            {isToday && (
                              <Button
                                size="small"
                                startIcon={<EditIcon />}
                                color="primary"
                                onClick={() => handleEditEntry(e)}
                                sx={{ mt: 1 }}
                              >
                                Edit
                              </Button>
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </Box>
                  );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}
