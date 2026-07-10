// This script seeds the Firestore database with initial product data
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUCcHMzBzJkWGFqxm_VSC1fH6MUjpDQcc",
  authDomain: "harimidhu-shop.firebaseapp.com",
  projectId: "harimidhu-shop",
  storageBucket: "harimidhu-shop.appspot.com",
  messagingSenderId: "479567208537",
  appId: "1:479567208537:web:7ba5fe9dac34e1f9ab1148"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Helper function to create a slug
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .trim();
};

// Initial product data
const products = [
    // Oil Category
    {
      name: "Groundnut Oil",
      category: "Oil",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743226225/groundnut-oil_qymoyl.jpg",
      price: 350,
      unit: "Litre",
      description: "Premium quality Groundnut Oil cold-pressed using traditional wooden chekku methods. Our groundnut oil retains all natural nutrients and has a rich, authentic flavor. Ideal for everyday cooking, frying, and traditional Tamil Nadu recipes."
    },
    {
      name: "Gingelly Oil",
      category: "Oil",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229625/gingerlyoil_cjkisa.webp",
      price: 450,
      unit: "Litre",
      description: "Pure sesame oil extracted through traditional chekku methods without heat, preserving all essential nutrients and natural antioxidants. This aromatic oil is perfect for cooking traditional dishes and offers numerous health benefits including improved heart health and joint pain relief."
    },
    {
      name: "Coconut Oil",
      category: "Oil",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229629/virgin-coconut-oil-500x500_nbzii2.webp",
      price: 320,
      unit: "Litre",
      description: "Cold-pressed virgin coconut oil extracted from fresh, mature coconuts. Our coconut oil has a delightful aroma and is rich in medium-chain fatty acids. Perfect for cooking, skin care, and hair treatments. Supports immunity and promotes healthy digestion."
    },
    {
      name: "Deepam Oil",
      category: "Oil",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229625/deepamoil_afvhbv.jpg",
      price: 280,
      unit: "Litre",
      description: "Traditional lamp oil specially formulated for temple lamps and household pooja rituals. This pure oil burns with a clean, steady flame and minimal smoke, making it ideal for daily spiritual practices. Made from select ingredients following age-old methods."
    },
    {
      name: "Neem Oil",
      category: "Oil",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432665/Neem_dkfi1y.jpg",
      price: 400,
      unit: "Litre",
      description: "Pure neem oil extracted from organically grown neem seeds. Known for its medicinal properties and natural insect-repelling qualities. Used in traditional medicine and organic farming. Rich in antioxidants and natural compounds beneficial for skin and hair health."
    },
    {
      name: "Castor Oil",
      category: "Oil",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432661/castor-oil_yd7iay.jpg",
      price: 380,
      unit: "Litre",
      description: "Cold-pressed castor oil from organically grown castor seeds. Traditionally used for hair care and medicinal purposes. Known for its anti-inflammatory properties and ability to promote hair growth. Also used in traditional medicine for various health benefits."
    },
    {
      name: "Butter Tree Oil",
      category: "Oil",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432661/butter-tree_sdxw6y.jpg",
      price: 420,
      unit: "Litre",
      description: "Traditional butter tree oil extracted from the seeds of the butter tree. Used in traditional medicine and hair care. Known for its nourishing properties and ability to promote healthy hair growth. Also used in traditional cooking and medicinal preparations."
    },
    // Rice Category
    {
      name: "Ponni Raw Rice",
      category: "Rice",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432660/ponirice_e2zx9c.jpg",
      price: 120,
      unit: "Kilogram",
      description: "Premium quality raw ponni rice sourced directly from organic farmers in Tamil Nadu. This medium-grain rice has excellent cooking qualities, a distinct aroma, and soft texture when cooked. Perfect for everyday meals and festive occasions."
    },
    {
      name: "Ponni Full Boiled Rice",
      category: "Rice",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432660/ponnirice_vkm9ys.webp",
      price: 130,
      unit: "Kilogram",
      description: "Premium quality fully boiled ponni rice, carefully processed to maintain its nutritional value. This rice variety is known for its excellent cooking properties and soft texture. Perfect for daily meals and special occasions."
    },
    {
      name: "Idly Rice",
      category: "Rice",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229626/idlirice_ygpka1.jpg",
      price: 90,
      unit: "Kilogram",
      description: "Specially selected rice variety perfect for making soft, fluffy idlis. Our idly rice combines perfectly with urad dal to create the perfect batter consistency. Sourced from traditional farmers who follow sustainable agricultural practices."
    },
    {
      name: "Ponni Boiled Broken Rice",
      category: "Rice",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229627/ponni-broken_jkl456.jpg",
      price: 100,
      unit: "Kilogram",
      description: "High-quality broken ponni rice, perfect for making traditional dishes and porridge. This rice variety is economical while maintaining good nutritional value. Ideal for daily consumption and making various rice-based dishes."
    },
    {
      name: "Red Rice",
      category: "Rice",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432661/redrice_phmuxp.jpg",
      price: 150,
      unit: "Kilogram",
      description: "Traditional red rice variety rich in antioxidants and essential nutrients. This unpolished rice has a distinct nutty flavor and is known for its health benefits. Perfect for those looking for healthier rice options."
    },
    {
      name: "Karupu Kavuni Rice",
      category: "Rice",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229627/Karuppu-Kavuni-Rice_oxvokt.png",
      price: 180,
      unit: "Kilogram",
      description: "Ancient black rice variety rich in antioxidants and essential minerals. This rare traditional Tamil Nadu rice turns deep purple when cooked and has a distinctive nutty flavor. Known for its medicinal properties and used in special dishes for celebrations and health remedies."
    },
    {
      name: "Maapilai Samba Rice",
      category: "Rice",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432664/mappillai_v3jn7i.jpg",
      price: 160,
      unit: "Kilogram",
      description: "Traditional samba rice variety known for its aromatic flavor and excellent cooking properties. This rice is perfect for making biryani and other special dishes. Sourced from traditional farmers who follow sustainable practices."
    },
    {
      name: "Basmathi Rice",
      category: "Rice",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432659/basmati-rice_bkluve.jpg",
      price: 200,
      unit: "Kilogram",
      description: "Premium quality basmati rice with long, slender grains and a distinctive aroma. Perfect for making biryani and other special dishes. Known for its excellent cooking properties and fluffy texture."
    },
    {
      name: "Seeragasamba Rice",
      category: "Rice",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432662/seeraga-samba_blzgz9.webp",
      price: 170,
      unit: "Kilogram",
      description: "Traditional seeraga samba rice known for its aromatic flavor and excellent cooking properties. This rice variety is perfect for making biryani and other special dishes. Sourced from traditional farmers."
    },
    // Millet Category
    {
      name: "Ragi",
      category: "Millet",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229628/ragi_nuplab.webp",
      price: 80,
      unit: "Kilogram",
      description: "Organic finger millet (ragi) grown without chemical pesticides or fertilizers. This nutrient-dense millet is rich in calcium, iron, and fiber. Perfect for making nutritious porridge, dosa, and roti. Supports bone health and provides sustained energy throughout the day."
    },
    {
      name: "Pearl Millet",
      category: "Millet",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432660/barnyard-millet_koro3d.jpg",
      price: 90,
      unit: "Kilogram",
      description: "Organically grown pearl millet (kambu) harvested from traditional farmlands. This ancient grain is high in protein, fiber, and essential minerals. Excellent for making rotis, porridge, and traditional Tamil dishes. Known for its cooling properties and gluten-free benefits."
    },
    {
      name: "Thinnai",
      category: "Millet",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432662/thinnai_iygzh5.jpg",
      price: 100,
      unit: "Kilogram",
      description: "Organic foxtail millet (thinnai) grown using traditional farming methods. Rich in protein, fiber, and essential minerals. Perfect for making porridge, upma, and traditional dishes. Known for its cooling properties and nutritional benefits."
    },
    {
      name: "Varagu",
      category: "Millet",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432663/varagu_xmg3qd.jpg",
      price: 95,
      unit: "Kilogram",
      description: "Organic kodo millet (varagu) harvested from traditional farmlands. High in protein, fiber, and essential minerals. Excellent for making porridge, upma, and traditional dishes. Known for its nutritional benefits and gluten-free properties."
    },
    {
      name: "Saamai",
      category: "Millet",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432662/samai_xko6qr.jpg",
      price: 110,
      unit: "Kilogram",
      description: "Organic little millet (saamai) grown using traditional farming methods. Rich in protein, fiber, and essential minerals. Perfect for making porridge, upma, and traditional dishes. Known for its nutritional benefits and gluten-free properties."
    },
    {
      name: "Guthura Vaali",
      category: "Millet",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229627/guthura-vaali_ghi123.jpg",
      price: 105,
      unit: "Kilogram",
      description: "Organic proso millet (guthura vaali) harvested from traditional farmlands. High in protein, fiber, and essential minerals. Excellent for making porridge, upma, and traditional dishes. Known for its nutritional benefits and gluten-free properties."
    },
    // Provisions Category
    {
      name: "Green Gram",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229626/green_gram_qqquve.jpg",
      price: 140,
      unit: "Kilogram",
      description: "Organic whole green gram (moong) sourced from pesticide-free farms. These protein-rich legumes are perfect for sprouting, making sundal, and preparing nutritious soups. They cook quickly and are easily digestible, making them ideal for all age groups."
    },
    {
      name: "Urad Dhal Whole (Black)",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432660/Black-Gram-Urad-Black_lyjt0a.webp",
      price: 160,
      unit: "Kilogram",
      description: "Premium quality whole black urad dal with skin intact, preserving maximum nutritional value. Essential for making idli, dosa batter, and traditional dishes. Our urad dal is carefully cleaned, sorted, and packaged to ensure the highest quality."
    },
    {
      name: "Urad Dhal Whole (White)",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432663/white-urad-dal_p19gm4.webp",
      price: 170,
      unit: "Kilogram",
      description: "Premium quality whole white urad dal, carefully cleaned and sorted. Perfect for making traditional dishes and sweets. Known for its high protein content and excellent cooking properties."
    },
    {
      name: "Urad Dhal Split (Black)",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229628/urad-split_mno789.jpg",
      price: 150,
      unit: "Kilogram",
      description: "Premium quality split black urad dal, perfect for making traditional dishes. Carefully cleaned and sorted to ensure the highest quality. Known for its excellent cooking properties and nutritional value."
    },
    {
      name: "Ground Nut",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432663/Groundnut_qm50hd.webp",
      price: 180,
      unit: "Kilogram",
      description: "Premium quality groundnuts, carefully cleaned and sorted. Perfect for making traditional snacks and dishes. Rich in protein and healthy fats. Can be used for making peanut butter and various traditional recipes."
    },
    {
      name: "Thuvar Dal",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432662/toor-dal_xsz1ej.jpg",
      price: 140,
      unit: "Kilogram",
      description: "Premium quality toor dal, essential for making sambar and other traditional dishes. Carefully cleaned and sorted to ensure the highest quality. Known for its excellent cooking properties and nutritional value."
    },
    {
      name: "Kadalai Parupu",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432664/kadalai-paruppu_t5qugy.jpg",
      price: 130,
      unit: "Kilogram",
      description: "Premium quality chana dal, perfect for making traditional dishes and sweets. Carefully cleaned and sorted to ensure the highest quality. Known for its excellent cooking properties and nutritional value."
    },
    {
      name: "Siru Parupu",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432665/siru-paruppu_kzxq2t.jpg",
      price: 120,
      unit: "Kilogram",
      description: "Premium quality red lentils, perfect for making traditional dishes. Carefully cleaned and sorted to ensure the highest quality. Known for its excellent cooking properties and nutritional value."
    },
    {
      name: "Kollu",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432664/kollu_ax1cho.jpg",
      price: 150,
      unit: "Kilogram",
      description: "Premium quality horse gram, known for its medicinal properties. Perfect for making traditional dishes and health remedies. Rich in protein and essential minerals."
    },
    {
      name: "Pani Payiru",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432660/pani-payaru._t9uaxj.jpg",
      price: 160,
      unit: "Kilogram",
      description: "Premium quality moth beans, perfect for making traditional dishes. Carefully cleaned and sorted to ensure the highest quality. Known for its excellent cooking properties and nutritional value."
    },
    {
      name: "Naatu Sakarai",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432664/nattu-sarkarai_es1uts.webp",
      price: 100,
      unit: "Kilogram",
      description: "Traditional jaggery made from pure sugarcane juice. Rich in minerals and natural sweetness. Perfect for making traditional sweets and beverages. Known for its health benefits and natural properties."
    },
    {
      name: "Paagu Vellam",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432659/pagu-vellam_aat0qr.webp",
      price: 120,
      unit: "Kilogram",
      description: "Traditional palm jaggery, rich in minerals and natural sweetness. Perfect for making traditional sweets and beverages. Known for its health benefits and natural properties."
    },
    {
      name: "Panang Karkandu",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432659/panang-kalkandu_usul1t.webp",
      price: 140,
      unit: "Kilogram",
      description: "Traditional palm sugar candy, perfect for making traditional sweets and beverages. Known for its health benefits and natural properties."
    },
    {
      name: "Ghee",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432663/ghee_eksdlg.jpg",
      price: 800,
      unit: "Kilogram",
      description: "Pure cow ghee made using traditional methods. Rich in essential fatty acids and vitamins. Perfect for cooking and traditional rituals. Known for its health benefits and natural properties."
    },
    {
      name: "Raagi Flour",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432661/raggi-flour_wdslqs.webp",
      price: 90,
      unit: "Kilogram",
      description: "Freshly ground ragi flour from organic finger millet. Perfect for making porridge, dosa, and traditional dishes. Rich in calcium and essential nutrients."
    },
    {
      name: "Chilli Powder",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432661/Chilli_jkln48.jpg",
      price: 200,
      unit: "Kilogram",
      description: "Freshly ground red chilli powder from premium quality chillies. Perfect for making traditional dishes. Known for its authentic flavor and aroma."
    },
    {
      name: "Dry Red Chilli",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432662/chilli_raw_kitjun.jpg",
      price: 180,
      unit: "Kilogram",
      description: "Premium quality dried red chillies. Perfect for making traditional dishes and chilli powder. Known for its authentic flavor and aroma."
    },
    {
      name: "Daniya Seeds",
      category: "Provisions",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432662/Daniya_ylc0oy.jpg",
      price: 160,
      unit: "Kilogram",
      description: "Premium quality coriander seeds. Perfect for making traditional dishes and spice powders. Known for its authentic flavor and aroma."
    },
    // Homemade Soaps Category
    {
      name: "Kupameni Soap",
      category: "Homemade Soaps",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229627/kuppameni_uniixp.webp",
      price: 60,
      unit: "Piece",
      description: "Handcrafted soap made with traditional kupameni herbs known for their skin-healing properties. This natural soap helps treat various skin conditions including eczema, psoriasis, and fungal infections. Free from harmful chemicals and artificial fragrances."
    },
    {
      name: "Paacha Payiru Soap",
      category: "Homemade Soaps",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432663/paccha-paiyru_gi2r8t.webp",
      price: 65,
      unit: "Piece",
      description: "Handcrafted soap made with green gram, known for its skin-nourishing properties. This natural soap helps maintain healthy skin and is free from harmful chemicals."
    },
    {
      name: "Nalangumavu Soap",
      category: "Homemade Soaps",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432664/nagamavu-soap_gnmzg6.webp",
      price: 70,
      unit: "Piece",
      description: "Handcrafted soap made with traditional ingredients known for their skin-healing properties. This natural soap helps maintain healthy skin and is free from harmful chemicals."
    },
    {
      name: "Goat Milk Soap",
      category: "Homemade Soaps",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229627/organic-goat-milk-soap_omkdna.jpg",
      price: 75,
      unit: "Piece",
      description: "Luxurious soap made with fresh goat milk from our own farm. Rich in vitamins and minerals, this gentle soap nourishes, moisturizes, and soothes sensitive skin. Contains natural ingredients that help maintain skin pH and alleviate dryness and irritation."
    },
    // Chekku Raw Materials Category
    {
      name: "Groundnut for Chekku",
      category: "Chekku Raw Materials",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743229626/groundnut-oil_uvielu.jpg",
      price: 180,
      unit: "Kilogram",
      description: "Premium quality groundnuts specially selected for oil extraction through traditional chekku methods. These high-oil-content peanuts are cleaned, sorted, and ready for pressing. You can also use them for making homemade peanut butter and traditional Tamil snacks."
    },
    {
      name: "Sesame Seed for Chekku",
      category: "Chekku Raw Materials",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743322127/sessame_za8ig4.jpg",
      price: 220,
      unit: "Kilogram",
      description: "Organic sesame seeds of the highest quality, specially curated for oil extraction. These nutrient-rich seeds yield aromatic, flavorful gingelly oil when pressed using traditional wooden chekku methods. Can also be used for cooking, baking, and making traditional sweets."
    },
    {
      name: "Koparai for Chekku",
      category: "Chekku Raw Materials",
      image: "https://res.cloudinary.com/dmhowu6cg/image/upload/v1743432664/koppari_cyibzs.jpg",
      price: 200,
      unit: "Kilogram",
      description: "Premium quality copra specially selected for oil extraction through traditional chekku methods. These high-oil-content coconut pieces are cleaned, sorted, and ready for pressing. Perfect for making pure coconut oil."
    }
  ]

async function seedDatabase() {
  const productsCollection = collection(db, 'products')
  
  console.log('Starting to seed Firestore database...')
  
  // Add products one by one
  for (const product of products) {
    try {
      // Let Firebase generate the document ID
      const docRef = await addDoc(productsCollection, {
        ...product,
        createdAt: new Date(),
        updatedAt: new Date(),
        stock_batches: []
      })
      console.log(`Added product: ${product.name} with ID: ${docRef.id}`)
    } catch (error) {
      console.error(`Error adding product ${product.name}:`, error)
    }
  }
  
  console.log('Finished seeding Firestore database!')
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('Seed completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('Error seeding database:', error)
    process.exit(1)
  }) 