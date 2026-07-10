import { useState, useEffect } from "react"
import { Plus, Download, AlertTriangle } from "lucide-react"
import { Invoice } from "@/types/index"
import { Button } from "@/components/ui/button"
import { generateInvoicePdf } from "@/utils/pdfUtils"
import { toast } from "sonner"
import { db } from "@/firebase"
import { doc, getDoc } from "firebase/firestore"

interface InvoiceTemplateProps {
  invoice: Invoice
  readOnly?: boolean
}

export default function InvoiceTemplate({ invoice, readOnly = true }: InvoiceTemplateProps) {
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Harimidhu Organic',
    owner: 'Karthick G',
    logo: '',
    qrImg: 'https://res.cloudinary.com/dyj3rywju/image/upload/v1746099387/harimidhu_qr_zinysn.jpg',
    address: 'No.71, comet street, VGN Windsor park,',
    city: 'Phase 4, Avadi, Chennai, Tamil Nadu 600077',
    country: 'India',
    email: 'info@harimidhu.com',
    phone: '+91 9876543210',
    taxRate: '5',
    gstin: '',
    paymentTerms: 'Immediate',
    signature: '',
    notes: 'Thank you for your business.'
  });
  
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        // Try to load from Firebase first
        const docRef = doc(db, 'companySettings', 'default')
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          setCompanyInfo(prev => ({...prev, ...docSnap.data()}))
        } else {
          // Fall back to localStorage if needed
          const savedInfo = localStorage.getItem('companyInfo')
          if (savedInfo) {
            try {
              setCompanyInfo(prev => ({...prev, ...JSON.parse(savedInfo)}))
            } catch (error) {
              console.error('Error parsing company info:', error)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching company info:', error)
      }
    }
    
    fetchCompanyInfo()
  }, [])

  const [items, setItems] = useState(
    invoice.items.length > 0
      ? invoice.items.map((item, index) => ({
          id: index + 1,
          description: item.name || item.productName || "",
          qty: item.quantity,
          rate: item.price || item.unitPrice || 0,
          amount: (item.price || item.unitPrice || 0) * item.quantity,
        }))
      : [
          { id: 1, description: "Product Item", qty: 1, rate: 0, amount: 0 },
          { id: 2, description: "", qty: 1, rate: 0, amount: 0 },
          { id: 3, description: "", qty: 1, rate: 0, amount: 0 },
        ]
  )

  const addItem = () => {
    if (readOnly) return
    setItems([...items, { id: items.length + 1, description: "", qty: 1, rate: 0, amount: 0 }])
  }

  // Calculate subtotal - sum of all items (prices already include GST)
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  
  // GST calculations - assuming GST is already included in item prices
  const gstRate = parseFloat(companyInfo.taxRate || '5') / 100
  const totalWithoutGST = +(subtotal / (1 + gstRate)).toFixed(2)
  
  // Calculate GST component from the total price
  const cgstRate = gstRate / 2
  const sgstRate = gstRate / 2
  const totalGST = +(subtotal - totalWithoutGST).toFixed(2)
  const cgstAmount = +(totalGST / 2).toFixed(2)
  const sgstAmount = +(totalGST / 2).toFixed(2)

  // Calculate totals including shipping and outstanding amount
  const shippingCost = invoice.shippingCost || 0
  
  // Check if we have outstanding amount
  const hasOutstandingAmount = invoice.outstandingAmount && invoice.outstandingAmount > 0 && invoice.includeOutstanding !== false
  const outstandingAmount = hasOutstandingAmount ? invoice.outstandingAmount : 0
  
  // Total calculations
  const orderTotal = subtotal + shippingCost
  const total = orderTotal + outstandingAmount
  const totalRounded = Math.round(total)

  // Convert to Indian number format
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(amount);
  }

  // Convert number to words
  const toWords = (num: number) => {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const formatWords = (n: number) => {
      if (n < 20) return units[n];
      const digit = n % 10;
      return tens[Math.floor(n / 10)] + (digit ? ' ' + units[digit] : '');
    };
    
    const convertToWords = (n: number) => {
      if (n === 0) return 'Zero';
      
      let result = '';
      
      if (Math.floor(n / 10000000) > 0) {
        result += `${convertToWords(Math.floor(n / 10000000))} Crore `;
        n %= 10000000;
      }
      
      if (Math.floor(n / 100000) > 0) {
        result += `${formatWords(Math.floor(n / 100000))} Lakh `;
        n %= 100000;
      }
      
      if (Math.floor(n / 1000) > 0) {
        result += `${formatWords(Math.floor(n / 1000))} Thousand `;
        n %= 1000;
      }
      
      if (Math.floor(n / 100) > 0) {
        result += `${formatWords(Math.floor(n / 100))} Hundred `;
        n %= 100;
      }
      
      if (n > 0) {
        result += formatWords(n);
      }
      
      return result.trim();
    };
    
    // Round to nearest whole number
    const roundedNum = Math.round(num);
    const wholePart = Math.floor(roundedNum);
    
    return convertToWords(wholePart) + ' only';
  };

  const handleDownloadPdf = async () => {
    try {
      // Use the loaded company info for the PDF
      const doc = await generateInvoicePdf(invoice, companyInfo)
      
      // Sanitize customer name for filename
      const sanitizedCustomerName = invoice.customerName
        .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      
      // Save the PDF with invoice ID and customer name
      doc.save(`${invoice.invoiceNumber}_${sanitizedCustomerName}.pdf`)
      toast.success('Invoice downloaded successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    }
  }

  // Format date to look like "03/15/2023"
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/') // ensure the format is correct
  }

  // Generate invoice number in format 0001/2025-26
  const formatInvoiceNumber = (invoiceNumber: string, createdAt: number) => {
    // Get financial year in format YYYY-YY
    const date = new Date(createdAt)
    const currentYear = date.getFullYear()
    const nextYear = currentYear + 1
    
    // Format as financial year YYYY-YY
    const financialYear = `${currentYear}-${nextYear.toString().slice(-2)}`
    
    return `${invoiceNumber}/${financialYear}`
  }

  // Split long text to max 30 words per line
  const formatLongText = (text: string, maxChars = 30) => {
    if (!text || text.length <= maxChars) return [text];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxChars) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  const invoiceNumber = formatInvoiceNumber(invoice.invoiceNumber, invoice.createdAt)
  const invoiceDate = formatDate(invoice.createdAt)
  const addressLines = formatLongText(invoice.deliveryAddress || '')

  // Calculate due amount
  const amountPaid = invoice.amountPaid || 0
  const dueAmount = total - amountPaid

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="border-b pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex flex-col items-start gap-2 mb-2">
              {companyInfo.logo ? (
                <img 
                  src={companyInfo.logo} 
                  alt="Company Logo" 
                  className="w-32 h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-3xl">
                  {companyInfo.name.charAt(0)}
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-800 uppercase mt-2">{companyInfo.name}</h2>
            </div>
            <p className="text-sm text-gray-600">{companyInfo.address}</p>
            <p className="text-sm text-gray-600">{companyInfo.city}</p>
            <p className="text-sm text-gray-600">{companyInfo.country}</p>
            {companyInfo.gstin && (
              <p className="text-sm text-gray-600 mt-1">GSTIN: {companyInfo.gstin}</p>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-800">TAX INVOICE</h1>
            {companyInfo.qrImg && (
              <div className="mt-2 flex justify-end">
                <img 
                  src={companyInfo.qrImg} 
                  alt="Payment QR Code" 
                  className="w-24 h-24 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="mb-4">
            <p className="text-sm mb-1"><span className="font-medium">Invoice No:</span> {invoiceNumber}</p>
            <p className="text-sm mb-1"><span className="font-medium">Invoice Date:</span> {invoiceDate}</p>
            <p className="text-sm mb-1"><span className="font-medium">Payment Terms:</span> {companyInfo.paymentTerms || 'Immediate'}</p>
          </div>
          
          <div className="border rounded p-3">
            <h3 className="font-medium text-gray-700 mb-1">Bill To</h3>
            <p className="text-sm text-gray-600">{invoice.customerName}</p>
            <p className="text-sm text-gray-600">
              {invoice.customerGstin ? `GSTIN: ${invoice.customerGstin}` : "Non GST Customer"}
            </p>
            {addressLines.map((line, index) => (
              <p key={index} className="text-sm text-gray-600">{line}</p>
            ))}
            <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
          </div>
        </div>
        
        <div>
          <div className="mt-20 border rounded p-3">
            <h3 className="font-medium text-gray-700 mb-1">Ship To</h3>
            <p className="text-sm text-gray-600">{invoice.customerName}</p>
            <p className="text-sm text-gray-600">
              {invoice.customerGstin ? `GSTIN: ${invoice.customerGstin}` : "Non GST Customer"}
            </p>
            {addressLines.map((line, index) => (
              <p key={index} className="text-sm text-gray-600">{line}</p>
            ))}
            <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mb-6">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 text-left text-sm border">S. No</th>
              <th className="py-2 px-3 text-left text-sm border">Description</th>
              <th className="py-2 px-3 text-center text-sm border">Qty</th>
              <th className="py-2 px-3 text-right text-sm border">Unit Price</th>
              <th className="py-2 px-3 text-right text-sm border">Net Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-t">
                <td className="py-2 px-3 text-sm border">{index + 1}</td>
                <td className="py-2 px-3 text-sm border">
                  {item.description || "Enter item name/description"}
                </td>
                <td className="py-2 px-3 text-center text-sm border">{item.qty}</td>
                <td className="py-2 px-3 text-right text-sm border">{formatCurrency(item.rate)}</td>
                <td className="py-2 px-3 text-right text-sm border">{formatCurrency(item.amount)}</td>
              </tr>
            ))}

            {!readOnly && (
              <tr>
                <td colSpan={5} className="py-2 px-3 border">
                  <button onClick={addItem} className="flex items-center text-green-600 text-sm gap-1">
                    <Plus size={16} className="text-green-600" />
                    <span>Add Line Item</span>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Amount in words:</h3>
            <p className="text-sm text-gray-600">{toWords(totalRounded)}</p>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Notes:</h3>
            <p className="text-sm text-gray-600">
              {invoice.notes && invoice.notes.trim() !== "" 
                ? invoice.notes 
                : (companyInfo.notes || "Thank you for your business.")}
            </p>
          </div>
        </div>
        
        <div>
          <div className="border-t pt-2">
            <div className="flex justify-between py-1">
              <span className="text-sm">Subtotal (excl. GST)</span>
              <span className="text-sm">{formatCurrency(totalWithoutGST)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm">CGST @ {(cgstRate * 100).toFixed(1)}%</span>
              <span className="text-sm">{formatCurrency(cgstAmount)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm">SGST @ {(sgstRate * 100).toFixed(1)}%</span>
              <span className="text-sm">{formatCurrency(sgstAmount)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm">Subtotal (incl. GST)</span>
              <span className="text-sm">{formatCurrency(subtotal)}</span>
            </div>
            {invoice.shippingCost && invoice.shippingCost > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-sm">Shipping Cost</span>
                <span className="text-sm">{formatCurrency(shippingCost)}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-sm font-medium">Order Total</span>
              <span className="text-sm font-medium">{formatCurrency(orderTotal)}</span>
            </div>
            
            {hasOutstandingAmount && (
              <div className="flex justify-between py-1 text-amber-600">
                <span className="text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Outstanding Amount
                </span>
                <span className="text-sm font-medium">{formatCurrency(outstandingAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-1 border-t border-gray-200 mt-2">
              <span className="text-sm font-bold">Total</span>
              <span className="text-sm font-bold">{formatCurrency(total)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-sm font-bold">Grand Total (Rounded off)</span>
              <span className="text-sm font-bold">Rs. {totalRounded}</span>
            </div>

            {invoice.paidStatus !== "paid" && dueAmount > 0 && (
              <div className="flex justify-between py-1 mt-2 text-red-600 border-t border-red-100">
                <span className="text-sm font-medium">Due Amount</span>
                <span className="text-sm font-medium">₹ {formatCurrency(dueAmount)}</span>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-between">
              <div></div>
              <div className="text-right">
                {companyInfo.signature ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={companyInfo.signature} 
                      alt="Authorized Signature" 
                      className="h-16 object-contain mb-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <p className="text-sm font-medium">Authorized Signature</p>
                  </div>
                ) : (
                  <p className="text-sm font-medium mb-8">Authorized Signature</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button 
          variant="outline" 
          className="gap-2 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
          onClick={handleDownloadPdf}
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  )
}