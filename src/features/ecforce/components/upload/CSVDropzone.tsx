import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface CSVDropzoneProps {
  onFileSelect: (file: File) => void
  isUploading: boolean
  selectedFile: File | null
}

export const CSVDropzone: React.FC<CSVDropzoneProps> = ({
  onFileSelect,
  isUploading,
  selectedFile,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  return (
    <div
      {...getRootProps()}
      className={`
        relative rounded-lg border-2 border-dashed p-8 text-center
        ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'}
        ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}
      `}
    >
      <input {...getInputProps()} />

      {selectedFile ? (
        <div className="space-y-2">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-sm font-medium text-gray-900">{selectedFile.name}</div>
          <div className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</div>
          {!isUploading && (
            <p className="text-xs text-gray-500">クリックまたはドラッグして別のファイルを選択</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex flex-col text-sm text-gray-600">
            <p className="font-medium">
              {isDragActive ? 'ファイルをドロップしてください' : 'CSVファイルをドラッグ&ドロップ'}
            </p>
            <p className="text-xs text-gray-500 mt-1">または、クリックしてファイルを選択</p>
          </div>
          <p className="text-xs text-gray-500">CSV形式（Shift-JIS対応）</p>
        </div>
      )}
    </div>
  )
}
