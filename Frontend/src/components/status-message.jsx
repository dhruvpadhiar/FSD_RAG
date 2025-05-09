export default function StatusMessage({ message, type = "info" }) {
    if (!message) return null
  
    const getTypeStyles = () => {
      switch (type) {
        case "error":
          return "bg-red-50 text-red-700 border-red-200"
        case "success":
          return "bg-green-50 text-green-700 border-green-200"
        case "warning":
          return "bg-yellow-50 text-yellow-700 border-yellow-200"
        default:
          return "bg-blue-50 text-blue-700 border-blue-200"
      }
    }
  
    return <div className={`p-3 rounded-md border ${getTypeStyles()} text-sm my-2`}>{message}</div>
  }
  