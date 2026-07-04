import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatWhatsappDisplay, getStoredWhatsappNumber, setStoredWhatsappNumber,
} from "@/lib/whatsapp";
import { toast } from "sonner";

export function WhatsappSettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: (number: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(getStoredWhatsappNumber());
  }, [open]);

  function salvar() {
    const digits = value.replace(/\D+/g, "");
    if (digits.length < 10 || digits.length > 15) {
      toast.error("Número de WhatsApp inválido (use DDD + número, ex.: 11 91234-5678)");
      return;
    }
    try {
      setStoredWhatsappNumber(value);
      const stored = getStoredWhatsappNumber();
      if (!stored) throw new Error("empty");
      toast.success(`WhatsApp salvo: ${formatWhatsappDisplay(stored)}`);
      onSaved?.(stored);
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar (armazenamento indisponível).");
    }
  }

  function limpar() {
    setStoredWhatsappNumber("");
    setValue("");
    toast.success("Número de WhatsApp removido");
    onSaved?.("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Número do WhatsApp da loja</DialogTitle>
          <DialogDescription>
            Este número recebe as consultas de estoque enviadas pelo botão “Consultar no WhatsApp”.
            Fica salvo apenas neste navegador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="wa-num">WhatsApp</Label>
          <Input
            id="wa-num"
            inputMode="tel"
            placeholder="Ex.: (11) 91234-5678"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            Se você digitar só o DDD + número, o país (Brasil, +55) é adicionado automaticamente.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={limpar} className="text-muted-foreground">
            Remover
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}