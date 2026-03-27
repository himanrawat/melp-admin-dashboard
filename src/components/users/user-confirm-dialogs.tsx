import { useState } from "react"
import { IconAlertTriangle, IconTrash, IconArrowBackUp, IconTrashX, IconMailForward } from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ── Delete (soft) ──────────────────────────────────────────
export function DeleteUserDialog({
  open,
  userName,
  count,
  onClose,
  onConfirm,
}: {
  open: boolean
  userName?: string
  count?: number
  onClose: () => void
  onConfirm: () => void
}) {
  const isBulk = !!count
  const title = isBulk ? `Delete ${count} users?` : `Delete "${userName}"?`
  const desc = isBulk
    ? `These ${count} users will be moved to the Deleted tab. You can restore them at any time.`
    : `${userName} will be moved to the Deleted tab. You can restore them at any time.`

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-destructive/10 shrink-0">
              <IconTrash className="size-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-0.5">{desc}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onClose() }}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Permanent Delete ───────────────────────────────────────
export function PermanentDeleteDialog({
  open,
  userName,
  count,
  onClose,
  onConfirm,
}: {
  open: boolean
  userName?: string
  count?: number
  onClose: () => void
  onConfirm: () => void
}) {
  const [confirmText, setConfirmText] = useState("")
  const isBulk = !!count
  const expected = "DELETE"

  function handleClose() {
    setConfirmText("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-destructive/10 shrink-0">
              <IconAlertTriangle className="size-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>
                {isBulk ? `Permanently delete ${count} users?` : `Permanently delete "${userName}"?`}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                This action cannot be undone. All data will be permanently removed.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="grid gap-1.5 py-1">
          <Label htmlFor="confirm-delete">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={confirmText !== expected}
            onClick={() => { onConfirm(); handleClose() }}
          >
            <IconTrashX className="size-4 mr-1.5" />
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Restore ────────────────────────────────────────────────
export function RestoreUserDialog({
  open,
  userName,
  count,
  onClose,
  onConfirm,
}: {
  open: boolean
  userName?: string
  count?: number
  onClose: () => void
  onConfirm: () => void
}) {
  const isBulk = !!count
  const title = isBulk ? `Restore ${count} users?` : `Restore "${userName}"?`
  const desc = isBulk
    ? `These ${count} users will be restored to Active and can access the platform again.`
    : `${userName} will be restored to Active and can access the platform again.`

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-success/10 shrink-0">
              <IconArrowBackUp className="size-5 text-success" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-0.5">{desc}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="melp-radius" onClick={() => { onConfirm(); onClose() }}>Restore</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Invite ─────────────────────────────────────────────────
export function InviteDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [emails, setEmails] = useState("")

  function handleClose() {
    setEmails("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconMailForward className="size-5" />
            Invite Team Members
          </DialogTitle>
          <DialogDescription>
            Enter email addresses separated by commas or new lines.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5 py-1">
          <Label htmlFor="invite-emails">Email addresses</Label>
          <textarea
            id="invite-emails"
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder={"alice@company.com\nbob@company.com"}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button className="melp-radius" disabled={!emails.trim()} onClick={handleClose}>
            <IconMailForward className="size-4 mr-1.5" />
            Send Invites
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
