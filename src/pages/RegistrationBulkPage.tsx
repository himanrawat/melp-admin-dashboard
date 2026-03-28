import { useState, useRef } from "react"
import {
  IconUpload,
  IconFileText,
  IconDownload,
  IconCheck,
  IconX,
  IconLoader2,
  IconAlertCircle,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

type UploadRecord = {
  id: string
  fileName: string
  totalRows: number
  successful: number
  failed: number
  status: "completed" | "failed" | "processing"
  uploadedAt: string
}

const uploadHistory: UploadRecord[] = [
  { id: "1", fileName: "employees_march_2026.csv", totalRows: 45, successful: 43, failed: 2, status: "completed", uploadedAt: "2026-03-15 10:32" },
  { id: "2", fileName: "new_hires_q1.csv", totalRows: 12, successful: 12, failed: 0, status: "completed", uploadedAt: "2026-03-01 14:20" },
  { id: "3", fileName: "sales_team_update.csv", totalRows: 8, successful: 5, failed: 3, status: "failed", uploadedAt: "2026-02-20 09:15" },
  { id: "4", fileName: "engineering_bulk.csv", totalRows: 20, successful: 20, failed: 0, status: "completed", uploadedAt: "2026-02-10 16:45" },
]

const csvTemplate = `first_name,last_name,email,phone,department,designation,location
John,Doe,john.doe@company.com,+1 555 000 0001,Engineering,Software Engineer,New York
Jane,Smith,jane.smith@company.com,+1 555 000 0002,Design,UX Designer,San Francisco`

export function RegistrationBulkPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) return
    setFile(f)
    setDone(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleUpload() {
    if (!file) return
    setUploading(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          setUploading(false)
          setDone(true)
          return 100
        }
        return p + 10
      })
    }, 150)
  }

  function downloadTemplate() {
    const blob = new Blob([csvTemplate], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "melp_bulk_upload_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bulk Upload</h1>
          <p className="text-sm text-muted-foreground">Upload a CSV file to register multiple users at once</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <IconDownload className="size-4 mr-1.5" />
          Download Template
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upload area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload CSV File</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Dropzone */}
              <div
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/30"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
                <div className="flex items-center justify-center size-12 rounded-full bg-secondary">
                  <IconUpload className="size-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {file ? file.name : "Drag & drop your CSV file here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : "or click to browse — .csv files only"}
                  </p>
                </div>
                {file && !done && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  >
                    <IconX className="size-3.5 mr-1.5" /> Remove
                  </Button>
                )}
              </div>

              {/* Upload progress */}
              {uploading && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <IconLoader2 className="size-4 animate-spin" /> Processing…
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Success state */}
              {done && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10">
                  <IconCheck className="size-5 text-success shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-success">Upload complete</p>
                    <p className="text-xs text-muted-foreground">Your file has been processed successfully.</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {file && !uploading && !done && (
                <Button className="melp-radius" onClick={handleUpload}>
                  <IconUpload className="size-4 mr-1.5" />
                  Upload & Process
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Upload history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium text-muted-foreground p-4">File</th>
                      <th className="text-left font-medium text-muted-foreground p-4">Rows</th>
                      <th className="text-left font-medium text-muted-foreground p-4">Result</th>
                      <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                      <th className="text-left font-medium text-muted-foreground p-4">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadHistory.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0 hover:bg-secondary/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <IconFileText className="size-4 text-muted-foreground" />
                            <span className="font-medium truncate max-w-[180px]">{r.fileName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{r.totalRows}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-success">{r.successful} ok</span>
                            {r.failed > 0 && <span className="text-destructive">{r.failed} failed</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="secondary"
                            className={
                              r.status === "completed" && r.failed === 0
                                ? "bg-success/10 text-success border-0 text-xs"
                                : r.status === "failed" || r.failed > 0
                                  ? "bg-warning/10 text-warning border-0 text-xs"
                                  : "text-xs"
                            }
                          >
                            {r.status === "completed" && r.failed === 0 ? "Success" : r.failed > 0 ? "Partial" : r.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">{r.uploadedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — instructions */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">File Requirements</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="size-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="font-medium">Use the CSV template</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Download the template above to ensure correct column headers.</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-2">
                <div className="size-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <p className="font-medium">Required columns</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["first_name", "last_name", "email"].map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs font-mono">{c}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-2">
                <div className="size-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">3</div>
                <div>
                  <p className="font-medium">Optional columns</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["phone", "department", "designation", "location"].map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs font-mono">{c}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-2">
                <IconAlertCircle className="size-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Duplicate emails will be skipped. Max 500 rows per upload.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
