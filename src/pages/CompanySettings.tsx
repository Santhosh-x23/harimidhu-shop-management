import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { companySettingsCollection, db } from '@/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const CompanySettings = () => {
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    owner: '',
    logo: '',
    qrImg: '',
    address: '',
    city: '',
    country: 'India',
    email: '',
    phone: '',
    taxRate: '0',
    gstin: '',
    paymentTerms: 'Immediate',
    signature: '',
    notes: 'Thank you for your business.'
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // First attempt to load from Firebase
    fetchCompanyInfo()
  }, [])

  const fetchCompanyInfo = async () => {
    try {
      const docRef = doc(db, 'companySettings', 'default')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        // Ensure all properties have values, using defaults for missing ones
        const data = docSnap.data()
        setCompanyInfo({
          name: data.name || '',
          owner: data.owner || '',
          logo: data.logo || '',
          qrImg: data.qrImg || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || 'India',
          email: data.email || '',
          phone: data.phone || '',
          taxRate: data.taxRate || '0',
          gstin: data.gstin || '',
          paymentTerms: data.paymentTerms || 'Immediate',
          signature: data.signature || '',
          notes: data.notes || 'Thank you for your business.'
        })
      } else {
        // If not in Firebase, try localStorage as fallback
        const savedInfo = localStorage.getItem('companyInfo')
        if (savedInfo) {
          try {
            const parsedInfo = JSON.parse(savedInfo)
            // Ensure default values for any missing properties
            setCompanyInfo(prevInfo => ({
              ...prevInfo,
              ...parsedInfo,
              name: parsedInfo.name || '',
              owner: parsedInfo.owner || '',
              logo: parsedInfo.logo || '',
              qrImg: parsedInfo.qrImg || '',
              address: parsedInfo.address || '',
              city: parsedInfo.city || '',
              country: parsedInfo.country || 'India',
              email: parsedInfo.email || '',
              phone: parsedInfo.phone || '',
              taxRate: parsedInfo.taxRate || '0',
              gstin: parsedInfo.gstin || '',
              paymentTerms: parsedInfo.paymentTerms || 'Immediate',
              signature: parsedInfo.signature || '',
              notes: parsedInfo.notes || 'Thank you for your business.'
            }))
            // Save to Firebase for future use
            await setDoc(doc(db, 'companySettings', 'default'), {
              ...companyInfo,
              ...parsedInfo,
              name: parsedInfo.name || '',
              owner: parsedInfo.owner || '',
              logo: parsedInfo.logo || '',
              qrImg: parsedInfo.qrImg || '',
              address: parsedInfo.address || '',
              city: parsedInfo.city || '',
              country: parsedInfo.country || 'India',
              email: parsedInfo.email || '',
              phone: parsedInfo.phone || '',
              taxRate: parsedInfo.taxRate || '0',
              gstin: parsedInfo.gstin || '',
              paymentTerms: parsedInfo.paymentTerms || 'Immediate',
              signature: parsedInfo.signature || '',
              notes: parsedInfo.notes || 'Thank you for your business.'
            })
          } catch (error) {
            console.error('Error parsing company info:', error)
            toast.error('Failed to parse company information')
          }
        }
      }
    } catch (error) {
      console.error('Error fetching company info:', error)
      toast.error('Failed to load company information')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Save to Firebase
      await setDoc(doc(db, 'companySettings', 'default'), companyInfo)
      
      // Also save to localStorage as backup
      localStorage.setItem('companyInfo', JSON.stringify(companyInfo))
      
      toast.success('Company information saved successfully!')
    } catch (error) {
      console.error('Error saving company info:', error)
      toast.error('Failed to save company information')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout title="Company Settings">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              This information will be used on invoices and other documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Your Company Name"
                    value={companyInfo.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner">Owner Name</Label>
                  <Input
                    id="owner"
                    name="owner"
                    placeholder="Company Owner Name"
                    value={companyInfo.owner}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    name="gstin"
                    placeholder="33ABCDE1234F1Z5"
                    value={companyInfo.gstin}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    name="paymentTerms"
                    placeholder="Immediate, Net 30, etc."
                    value={companyInfo.paymentTerms}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="company@example.com"
                    value={companyInfo.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+91 1234567890"
                    value={companyInfo.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    name="logo"
                    placeholder="https://example.com/logo.png"
                    value={companyInfo.logo}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qrImg">Payment QR Code URL</Label>
                  <Input
                    id="qrImg"
                    name="qrImg"
                    placeholder="https://example.com/qr-code.png"
                    value={companyInfo.qrImg}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-muted-foreground">QR code for UPI, bank transfer, etc.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signature">Signature Image URL</Label>
                  <Input
                    id="signature"
                    name="signature"
                    placeholder="https://example.com/signature.png"
                    value={companyInfo.signature}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    name="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Enter tax rate (e.g. 5)"
                    value={companyInfo.taxRate}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Invoice Notes</Label>
                  <Input
                    id="notes"
                    name="notes"
                    placeholder="Thank you for your business."
                    value={companyInfo.notes}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="123 Main Street"
                    value={companyInfo.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City, State, Zip</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="Bengaluru, Karnataka 560001"
                    value={companyInfo.city}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    placeholder="India"
                    value={companyInfo.country}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  className="gap-2 bg-organic-primary hover:bg-organic-dark"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Preview</CardTitle>
            <CardDescription>
              Here's how your company information will appear on invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-4">
                    {companyInfo.logo ? (
                      <img 
                        src={companyInfo.logo} 
                        alt="Company Logo" 
                        className="w-16 h-16 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.className = 'w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold';
                          e.currentTarget.innerText = companyInfo.name?.charAt(0) || 'H';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {companyInfo.name?.charAt(0) || 'H'}
                      </div>
                    )}
                    <h2 className="text-xl font-bold text-gray-700 uppercase">{companyInfo.name || 'Harimidhu Organic'}</h2>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{companyInfo.address || 'Company\'s Address'}</p>
                  <p className="text-sm text-gray-600">{companyInfo.city || 'City, State Zip'}</p>
                  <p className="text-sm text-gray-600">{companyInfo.country || 'India'}</p>
                  {companyInfo.gstin && (
                    <p className="text-sm text-gray-600 mt-1">GSTIN: {companyInfo.gstin}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">{companyInfo.email || 'company@example.com'}</p>
                  <p className="text-sm text-gray-600">{companyInfo.phone || '+91 1234567890'}</p>
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-bold text-gray-700">TAX INVOICE</h1>
                  {companyInfo.qrImg && (
                    <div className="mt-2 flex justify-end">
                      <img 
                        src={companyInfo.qrImg} 
                        alt="Payment QR Code" 
                        className="w-24 h-24 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                      <div className="text-gray-600 text-right">Invoice #:</div>
                      <div className="text-blue-600 text-right">INV00001</div>
                      <div className="text-gray-600 text-right">Invoice Date:</div>
                      <div className="text-right">01/01/2023</div>
                      <div className="text-gray-600 text-right">Payment Terms:</div>
                      <div className="text-right">{companyInfo.paymentTerms || 'Immediate'}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-600">{companyInfo.notes}</p>
                </div>
                <div className="text-right">
                  {companyInfo.signature ? (
                    <div className="flex flex-col items-center">
                      <img 
                        src={companyInfo.signature} 
                        alt="Authorized Signature" 
                        className="h-12 object-contain mb-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <p className="text-xs font-medium text-gray-600">Authorized Signature</p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-600">Authorized Signature</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default CompanySettings 