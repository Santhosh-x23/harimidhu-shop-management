import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { invoicesCollection } from '@/firebase'
import { Invoice } from '@/types'
import { Invoice as IndexInvoice } from '@/types/index'
import { toast } from 'sonner'
import InvoiceTemplate from './InvoiceTemplate'

const ViewInvoice = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [formattedInvoice, setFormattedInvoice] = useState<IndexInvoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchInvoiceDetails()
    } else {
      setIsLoading(false)
      toast.error('Invoice ID not found')
      navigate('/invoices')
    }
  }, [id])

  useEffect(() => {
    if (invoice) {
      // Adapt the invoice to match the expected type in InvoiceTemplate
      setFormattedInvoice({
        ...invoice,
        customerPhone: invoice.customerPhone || "",
        deliveryAddress: invoice.deliveryAddress || "",
        paymentDate: invoice.paymentDate || undefined,
        updatedAt: undefined
      } as IndexInvoice)
    }
  }, [invoice])

  const fetchInvoiceDetails = async () => {
    if (!id) return

    try {
      setIsLoading(true)
      const invoiceDoc = await getDoc(doc(invoicesCollection, id))
      
      if (invoiceDoc.exists()) {
        const data = invoiceDoc.data()
        setInvoice({
          id: invoiceDoc.id,
          ...data
        } as Invoice)
      } else {
        toast.error('Invoice not found')
        navigate('/invoices')
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error)
      toast.error('Failed to fetch invoice details')
      navigate('/invoices')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Invoice Details">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!invoice || !formattedInvoice) {
    return (
      <DashboardLayout title="Invoice Details">
        <div className="text-center py-10">
          <p className="text-muted-foreground">Invoice not found</p>
          <Link to="/invoices" className="mt-4 inline-block">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Invoice Details">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Link to="/invoices">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
        </div>

        <InvoiceTemplate invoice={formattedInvoice} />
      </div>
    </DashboardLayout>
  )
}

export default ViewInvoice 