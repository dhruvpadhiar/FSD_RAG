"use client"

import { useState, useRef } from "react"
import { Upload, Loader2, File } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function FileUpload({ apiStatus, setUploadStatus, setErrorMessage }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const MAX_RETRIES = 2 // Retry up to 2 times

  const handleFileChange = (event) => {
    const files = event.target.files
    if (files) {
      const pdfFiles = Array.from(files).filter((file) => {
        if (file.type !== "application/pdf") {
          setErrorMessage(`Invalid file type: ${file.name} is not a PDF`)
          return false
        }
        if (file.size > MAX_FILE_SIZE) {
          setErrorMessage(`File too large: ${file.name} exceeds 10MB limit`)
          return false
        }
        return true
      })

      setSelectedFiles(pdfFiles)
      if (pdfFiles.length === files.length) {
        setErrorMessage(null)
      }
    }
  }

  const uploadWithRetry = async (formData, retries) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000)
    try {
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === "AbortError" || retries <= 0) {
        throw error
      }
      // Wait 2 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return uploadWithRetry(formData, retries - 1)
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage("Please select at least one PDF file")
      return
    }

    setIsUploading(true)
    setUploadStatus("uploading")

    const formData = new FormData()
    selectedFiles.forEach((file) => {
      formData.append("files", file)
    })

    try {
      const response = await uploadWithRetry(formData, MAX_RETRIES)
      const data = await response.json()

      if (response.ok) {
        setUploadStatus("success")
        setSelectedFiles([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } else {
        setUploadStatus("error")
        setErrorMessage(data.error || "Upload failed")
      }
    } catch (error) {
      setUploadStatus("error")
      const errorMsg =
        error.name === "AbortError"
          ? "Upload request timed out"
          : "Network error. Server may have crashed. Please try again."
      setErrorMessage(errorMsg)
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-border rounded-lg p-4 md:p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={triggerFileInput}
      >
        <div>
          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-foreground mb-1 font-medium">Click to upload PDFs</p>
          <p className="text-xs text-muted-foreground">Max 10MB per file</p>
          <input
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
            disabled={apiStatus !== "healthy"}
          />
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4 bg-muted p-3 rounded-lg border border-border">
          <p className="text-sm font-medium mb-2 text-foreground">Selected files ({selectedFiles.length}):</p>
          <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <li key={index} className="flex items-center gap-2 p-1.5 rounded hover:bg-background">
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={selectedFiles.length === 0 || isUploading || apiStatus !== "healthy"}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload PDFs
          </>
        )}
      </Button>
    </div>
  )
}
