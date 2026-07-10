import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Clock } from 'lucide-react'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { invoicesCollection } from '@/firebase'
import { Invoice, PaymentRecord } from '@/types'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Separator } from '@/components/ui/separator'
import { formatInvoiceNumber } from './InvoiceGenerator'

function UpdateInvoiceStatus() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [status, setStatus] = useState<string>('')
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [paymentNote, setPaymentNote] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    if (!id) return

    try {
      const invoiceDoc = await getDoc(doc(invoicesCollection, id))
      if (invoiceDoc.exists()) {
        const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice
        setInvoice(invoiceData)
        setStatus(invoiceData.paidStatus)
        setAmountPaid(invoiceData.amountPaid || 0)
      } else {
        toast.error('Invoice not found')
        navigate('/invoices')
      }
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast.error('Failed to fetch invoice')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    
    // If changing from partially paid to paid, set amount paid to total
    if (value === 'paid' && invoice) {
      setAmountPaid(invoice.total)
    }
  }

  const handleAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value)) {
      // Ensure amount paid cannot exceed total
      if (invoice && value > invoice.total) {
        setAmountPaid(invoice.total)
      } else {
        setAmountPaid(value)
      }
    } else {
      setAmountPaid(0)
    }
  }

  const handleUpdate = async () => {
    if (!id || !status || !invoice) return

    // Validate amount paid for partially paid status
    if (status === 'partially_paid' && amountPaid <= 0) {
      toast.error('Please enter the amount paid')
      return
    }

    // Validate amount paid cannot exceed total
    if (amountPaid > invoice.total) {
      toast.error('Amount paid cannot exceed total invoice amount')
      return
    }

    try {
      setIsUpdating(true)
      
      // Calculate the amount for this payment transaction
      const previousAmountPaid = invoice.amountPaid || 0
      const currentPaymentAmount = status === 'unpaid' 
        ? 0 
        : (status === 'paid' ? invoice.total : amountPaid) - previousAmountPaid
      
      // Create payment record
      const paymentRecord: PaymentRecord = {
        amount: currentPaymentAmount,
        date: new Date().toISOString(),
        note: paymentNote || `Status updated to ${status}`,
        previousStatus: invoice.paidStatus,
        newStatus: status
      }
      
      const updateData: Record<string, any> = {
        paidStatus: status,
        updatedAt: new Date().toISOString()
      }

      // Set amountPaid based on status
      if (status === 'paid') {
        updateData.amountPaid = invoice.total
      } else if (status === 'partially_paid') {
        updateData.amountPaid = amountPaid
      } else if (status === 'unpaid') {
        updateData.amountPaid = 0
      }
      
      // Add payment record to history if there's an actual payment
      if (currentPaymentAmount !== 0 || status !== invoice.paidStatus) {
        if (!invoice.paymentHistory) {
          updateData.paymentHistory = [paymentRecord]
        } else {
          updateData.paymentHistory = arrayUnion(paymentRecord)
        }
      }

      await updateDoc(doc(invoicesCollection, id), updateData)
      toast.success('Invoice status updated successfully')
      navigate('/invoices')
    } catch (error) {
      console.error('Error updating invoice status:', error)
      toast.error('Failed to update invoice status')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Update Invoice Status">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Update Invoice Status">
        <div className="text-center py-10">
          <p className="text-muted-foreground">Invoice not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Update Invoice Status">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Update Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Invoice ID
                  </h3>
                  <p>{formatInvoiceNumber(invoice.id, invoice.createdAt)}</p>
                </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Total Amount
                    </h3>
                    <p>₹{invoice.total.toFixed(2)}</p>
                  </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Current Status
                  </h3>
                  <p className="capitalize">{invoice.paidStatus}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    New Status
                  </h3>
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                  {status === 'partially_paid' && (
                    <div className="space-y-2">
                      <Label htmlFor="amountPaid">Amount Paid</Label>
                      <div className="flex items-center">
                        <span className="mr-2">₹</span>
                        <Input
                          id="amountPaid"
                          type="number"
                          min="0"
                          max={invoice.total}
                          step="0.01"
                          value={amountPaid}
                          onChange={handleAmountPaidChange}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Due: ₹{(invoice.total - amountPaid).toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="paymentNote">Payment Note (Optional)</Label>
                    <Input
                      id="paymentNote"
                      placeholder="Add a note about this payment"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                    />
                  </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleUpdate}
                    disabled={
                      isUpdating || 
                      (status === invoice.paidStatus && amountPaid === (invoice.amountPaid || 0))
                    }
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Previous payment records for this invoice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoice.paymentHistory && invoice.paymentHistory.length > 0 ? (
                <div className="space-y-4">
                  {invoice.paymentHistory.map((payment, index) => (
                    <div key={index} className="border rounded-md p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(payment.date), 'dd MMM yyyy - HH:mm')}
                          </span>
                        </div>
                        <span className={payment.amount > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {payment.amount > 0 ? `+₹${payment.amount.toFixed(2)}` : `-₹${Math.abs(payment.amount).toFixed(2)}`}
                        </span>
                      </div>
                      <p className="text-sm mb-1">
                        {payment.note}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Status changed from <span className="capitalize">{payment.previousStatus}</span> to <span className="capitalize">{payment.newStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No payment history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default UpdateInvoiceStatus 