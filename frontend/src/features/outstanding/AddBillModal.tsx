import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, IndianRupee, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { outstandingApi, type CreateBillInput } from "@/entities/outstanding/api";
import { paymentTypeOptions, type PaymentType } from "@/entities/outstanding/model";
import { ClientPicker } from "@/features/client-picker/ClientPicker";
import { apiErrorMessage } from "@/shared/api/client";
import { cn } from "@/shared/lib/cn";
import { Button, Input, Label, Modal } from "@/shared/ui";

const today = () => new Date().toISOString().slice(0, 10);

// Shared "raise a bill" popup, used on both the staff portal and admin side.
export function AddBillModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState<number | "">("");
  const [customerName, setCustomerName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [billDate, setBillDate] = useState(today());
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Optional first payment recorded with the bill.
  const [paidNow, setPaidNow] = useState("");
  const [payType, setPayType] = useState<PaymentType>("cash");
  const [chequeNumber, setChequeNumber] = useState("");
  const [bankName, setBankName] = useState("");

  const reset = () => {
    setCustomerId(""); setCustomerName(""); setBillNumber(""); setItemName(""); setAmount("");
    setBillDate(today()); setDescription(""); setImage(null); setPreview(null);
    setPaidNow(""); setPayType("cash"); setChequeNumber(""); setBankName("");
  };

  const save = useMutation({
    mutationFn: async () => {
      const input: CreateBillInput = {
        customer_id: Number(customerId),
        bill_number: billNumber || undefined,
        item_name: itemName || undefined,
        amount: Number(amount),
        bill_date: billDate || undefined,
        description: description || undefined,
      };
      const bill = await outstandingApi.create(input);
      if (image) await outstandingApi.uploadBillImage(bill.id, image);
      // Record an opening payment if an amount was entered.
      if (Number(paidNow) > 0) {
        await outstandingApi.addPayment(bill.id, {
          amount: Number(paidNow),
          payment_type: payType,
          cheque_number: payType === "cheque" ? chequeNumber : undefined,
          bank_name: payType === "cheque" ? bankName : undefined,
        });
      }
      return bill;
    },
    onSuccess: () => {
      toast.success("Bill added ✅");
      qc.invalidateQueries({ queryKey: ["bills"] });
      reset();
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setImage(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const canSave = customerId && Number(amount) > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="sheet"
      title="New Bill"
      description="Raise a bill for a customer."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} disabled={!canSave} onClick={() => save.mutate()}>Save Bill</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Client</Label>
          <ClientPicker value={customerId} valueName={customerName} onChange={(id, name) => { setCustomerId(id); setCustomerName(name); }} />
        </div>
        <div className="space-y-1.5">
          <Label>Item name</Label>
          <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Premium Pen ×12" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Bill number</Label>
            <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="INV-204" />
          </div>
          <div className="space-y-1.5">
            <Label>Bill date</Label>
            <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Total bill amount</Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
        </div>
        {/* Optional opening payment */}
        <div className="space-y-2 rounded-lg border border-border p-3">
          <Label>Paid now (optional)</Label>
          <Input type="number" inputMode="decimal" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} placeholder="0" />
          {Number(paidNow) > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {paymentTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPayType(opt.value)}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium transition-colors",
                      payType === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {payType === "cheque" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="Cheque #" />
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Bill photo</Label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn("flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted transition-colors hover:border-primary")}
          >
            {preview ? (
              <div className="relative h-full w-full">
                <img src={preview} alt="preview" className="h-full w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded-full bg-background/90 p-1.5 shadow"><RefreshCw className="h-4 w-4" /></span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Camera className="h-5 w-5" />
                <span className="text-xs">Tap to add photo</span>
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </div>
      </div>
    </Modal>
  );
}
