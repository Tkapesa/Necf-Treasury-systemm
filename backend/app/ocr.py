"""
OCR (Optical Character Recognition) utilities for processing receipt images.

Provides functions for extracting text and data from receipt images
using various OCR engines and machine learning models.
Supports Turkish language and enhanced data extraction.
"""

import re
import asyncio
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from pathlib import Path

# Mock OCR result for demonstration
# In production, replace with actual OCR service (Tesseract, AWS Textract, Google Vision, etc.)

class OCRResult:
    """OCR processing result container with enhanced data extraction."""
    
    def __init__(
        self,
        vendor: Optional[str] = None,
        amount: Optional[float] = None,
        date: Optional[date] = None,
        description: Optional[str] = None,
        category: Optional[str] = None,
        items: Optional[List[Dict[str, Any]]] = None,
        confidence: float = 0.0,
        raw_text: str = "",
        processing_time: float = 0.0
    ):
        self.vendor = vendor
        self.amount = amount
        self.date = date
        self.description = description
        self.category = category
        self.items = items or []
        self.confidence = confidence
        self.raw_text = raw_text
        self.processing_time = processing_time

class ReceiptParser:
    """Parser for extracting structured data from OCR text with Turkish support."""
    
    # Common vendor patterns (English and Turkish)
    VENDOR_PATTERNS = [
        r"^([A-Z][A-Z\s&.'-]+[A-Z])\s*$",  # All caps company names
        r"^([A-Z][a-zA-ZÇĞIİÖŞÜçğıiöşü\s&.'-]{2,30})\s*$",  # Title case with Turkish chars
        r"(\w+\s*(?:MARKET|STORE|SHOP|DELI|RESTAURANT|CAFE|PIZZA|BURGER|MARKET|MAĞAZA|RESTAURANT|RESTORAN|CAFE|KAFE))",
        r"((?:MC|MAC)?[A-ZÇĞIİÖŞÜ][a-zA-ZÇĞIİÖŞÜçğıiöşü]+(?:'S|'S|\sINC|\sLLC|\sCO\.?|\sCORP\.?|\sLTD|\sAŞ|\sLTD\.?))",
        # Turkish specific patterns
        r"([A-ZÇĞIİÖŞÜ][a-zA-ZÇĞIİÖŞÜçğıiöşü\s]+(?:MAĞAZA|MARKET|RESTORAN|LOKANTA|KAFE|BÜFE))",
    ]
    
    # Amount patterns (Turkish and English)
    AMOUNT_PATTERNS = [
        # English patterns
        r"TOTAL[\s:]*\$?(\d{1,6}[\.,]\d{2})",
        r"AMOUNT[\s:]*\$?(\d{1,6}[\.,]\d{2})",
        r"SUBTOTAL[\s:]*\$?(\d{1,6}[\.,]\d{2})",
        r"\$(\d{1,6}[\.,]\d{2})\s*TOTAL",
        r"\$(\d{1,6}[\.,]\d{2})$",  # Line ending with amount
        # Turkish patterns
        r"TOPLAM[\s:]*(\d{1,6}[\.,]\d{2})\s*(?:TL|₺)?",
        r"GENEL\s+TOPLAM[\s:]*(\d{1,6}[\.,]\d{2})\s*(?:TL|₺)?",
        r"ARA\s+TOPLAM[\s:]*(\d{1,6}[\.,]\d{2})\s*(?:TL|₺)?",
        r"TUTAR[\s:]*(\d{1,6}[\.,]\d{2})\s*(?:TL|₺)?",
        r"(\d{1,6}[\.,]\d{2})\s*(?:TL|₺)\s*TOPLAM",
        r"(\d{1,6}[\.,]\d{2})\s*(?:TL|₺)$",  # Line ending with Turkish amount
        # Combined patterns
        r"T\.?O\.?P\.?L\.?A\.?M\.?[\s:]*(\d{1,6}[\.,]\d{2})",
    ]
    
    # Date patterns (Turkish and English)
    DATE_PATTERNS = [
        # English patterns
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        r"(\d{2,4}[/-]\d{1,2}[/-]\d{1,2})",
        r"((?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+\d{1,2},?\s+\d{2,4})",
        r"(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+\d{2,4})",
        # Turkish patterns
        r"(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})",
        r"(\d{1,2}\s+(?:OCA|ŞUB|MAR|NİS|MAY|HAZ|TEM|AĞU|EYL|EKİ|KAS|ARA)[A-ZÇĞIİÖŞÜ]*\s+\d{2,4})",
        r"((?:OCA|ŞUB|MAR|NİS|MAY|HAZ|TEM|AĞU|EYL|EKİ|KAS|ARA)[A-ZÇĞIİÖŞÜ]*\s+\d{1,2},?\s+\d{2,4})",
        # Date labels
        r"TARİH[\s:]*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})",
        r"DATE[\s:]*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})",
        r"SAAT[\s:]*(\d{1,2}:\d{2})",  # Time in Turkish
        r"TIME[\s:]*(\d{1,2}:\d{2})",  # Time in English
    ]
    
    # Category keywords (Turkish and English)
    CATEGORY_KEYWORDS = {
        'food': [
            # English
            'restaurant', 'cafe', 'deli', 'pizza', 'burger', 'taco', 'sushi',
            'grocery', 'market', 'food', 'dining', 'coffee', 'bakery',
            # Turkish
            'restoran', 'restaurant', 'kafe', 'cafe', 'lokanta', 'yemek',
            'market', 'bakkal', 'manav', 'kasap', 'fırın', 'pastane',
            'kahve', 'çay', 'büfe', 'kantin', 'aşçı', 'mutfak'
        ],
        'transportation': [
            # English
            'gas', 'fuel', 'station', 'exxon', 'shell', 'bp', 'chevron',
            'uber', 'lyft', 'taxi', 'parking', 'metro', 'transit',
            # Turkish
            'benzin', 'akaryakıt', 'petrol', 'istasyon', 'taksi',
            'park', 'otopark', 'metro', 'otobüs', 'ulaşım', 'trafik'
        ],
        'office': [
            # English
            'office', 'depot', 'staples', 'supplies', 'paper', 'printer',
            'computer', 'electronics', 'best buy', 'amazon',
            # Turkish
            'ofis', 'büro', 'kırtasiye', 'kağıt', 'yazıcı', 'bilgisayar',
            'elektronik', 'malzeme', 'tedarik', 'kalem', 'dosya'
        ],
        'healthcare': [
            # English
            'pharmacy', 'cvs', 'walgreens', 'medical', 'doctor', 'hospital',
            'clinic', 'dentist', 'health', 'prescription',
            # Turkish
            'eczane', 'sağlık', 'hastane', 'doktor', 'hekim', 'klinik',
            'diş', 'reçete', 'ilaç', 'tıbbi', 'tedavi', 'muayene'
        ],
        'utilities': [
            # English
            'electric', 'power', 'gas', 'water', 'internet', 'phone',
            'utility', 'bill', 'service',
            # Turkish
            'elektrik', 'güç', 'enerji', 'su', 'doğalgaz', 'internet',
            'telefon', 'fatura', 'hizmet', 'ödeme', 'ücret'
        ],
        'maintenance': [
            # English
            'repair', 'maintenance', 'cleaning', 'service', 'parts',
            'hardware', 'home depot', 'lowes',
            # Turkish
            'tamir', 'bakım', 'temizlik', 'servis', 'parça', 'yedek',
            'hırdavat', 'yapı', 'malzeme', 'usta', 'işçi'
        ]
    }
    
    def extract_vendor(self, text: str) -> Optional[str]:
        """Extract vendor name from OCR text."""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Try first few lines for vendor name
        for line in lines[:5]:
            for pattern in self.VENDOR_PATTERNS:
                match = re.search(pattern, line.upper())
                if match:
                    vendor = match.group(1).title()
                    # Clean up common artifacts
                    vendor = re.sub(r'\s+', ' ', vendor)
                    vendor = vendor.replace('  ', ' ')
                    if len(vendor) > 3 and len(vendor) < 50:
                        return vendor
        
        # Fallback: use first meaningful line
        for line in lines[:3]:
            if len(line) > 3 and len(line) < 50 and not re.match(r'^\d', line):
                return line.title()
        
        return None
    
    def extract_amount(self, text: str) -> Optional[float]:
        """Extract total amount from OCR text with Turkish currency support."""
        # Remove line breaks and extra spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Try each pattern
        for pattern in self.AMOUNT_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    # Get the largest amount (likely the total)
                    amounts = []
                    for match in matches:
                        # Handle Turkish decimal format (comma as decimal separator)
                        amount_str = match.replace(',', '.')
                        amounts.append(float(amount_str))
                    return max(amounts)
                except ValueError:
                    continue
        
        return None
    
    def extract_items(self, text: str) -> List[Dict[str, Any]]:
        """Extract individual items from receipt text."""
        items = []
        lines = text.split('\n')
        
        # Item patterns (Turkish and English)
        item_patterns = [
            # English patterns
            r'^(.+?)\s+(\d+[\.,]\d{2})\s*$',  # Item name followed by price
            r'^(\d+)x?\s+(.+?)\s+(\d+[\.,]\d{2})\s*$',  # Quantity x item price
            r'^(.+?)\s+(\d+[\.,]\d{2})\s*(?:TL|₺|\$)?\s*$',  # Item with currency
            # Turkish patterns
            r'^(.+?)\s+(\d+[\.,]\d{2})\s*(?:TL|₺)\s*$',  # Turkish currency
            r'^(\d+)\s*(?:ADET|AD|X)\s+(.+?)\s+(\d+[\.,]\d{2})\s*(?:TL|₺)?\s*$',  # Turkish quantity
        ]
        
        for line in lines:
            line = line.strip()
            if not line or len(line) < 5:  # Skip very short lines
                continue
                
            # Skip lines that look like headers, totals, or metadata
            skip_keywords = [
                'TOTAL', 'TOPLAM', 'SUBTOTAL', 'ARA TOPLAM', 'TAX', 'KDV',
                'DATE', 'TARİH', 'TIME', 'SAAT', 'RECEIPT', 'FİŞ',
                'THANK', 'TEŞEKKÜR', 'CARD', 'KART', 'CASH', 'NAKİT'
            ]
            
            if any(keyword in line.upper() for keyword in skip_keywords):
                continue
            
            for pattern in item_patterns:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    groups = match.groups()
                    
                    if len(groups) == 2:  # Item name and price
                        name, price_str = groups
                        quantity = 1
                    elif len(groups) == 3:  # Quantity, item name, and price
                        if groups[0].isdigit():  # First group is quantity
                            quantity_str, name, price_str = groups
                            try:
                                quantity = int(quantity_str)
                            except ValueError:
                                quantity = 1
                        else:  # First group is part of name
                            name, _, price_str = groups
                            quantity = 1
                    else:
                        continue
                    
                    try:
                        # Handle Turkish decimal format
                        price_str = price_str.replace(',', '.')
                        price = float(price_str)
                        
                        # Clean up item name
                        name = name.strip()
                        name = re.sub(r'\s+', ' ', name)  # Normalize spaces
                        
                        if len(name) > 2 and price > 0:  # Reasonable item
                            items.append({
                                'name': name,
                                'price': price,
                                'quantity': quantity,
                                'total': price * quantity
                            })
                            break  # Found a match, don't try other patterns
                    except ValueError:
                        continue
        
        return items
    
    def extract_date(self, text: str) -> Optional[date]:
        """Extract transaction date from OCR text with Turkish support."""
        # Turkish month mapping
        turkish_months = {
            'OCA': 'JAN', 'OCAK': 'JAN',
            'ŞUB': 'FEB', 'ŞUBAT': 'FEB',
            'MAR': 'MAR', 'MART': 'MAR',
            'NİS': 'APR', 'NİSAN': 'APR',
            'MAY': 'MAY', 'MAYIS': 'MAY',
            'HAZ': 'JUN', 'HAZİRAN': 'JUN',
            'TEM': 'JUL', 'TEMMUZ': 'JUL',
            'AĞU': 'AUG', 'AĞUSTOS': 'AUG',
            'EYL': 'SEP', 'EYLÜL': 'SEP',
            'EKİ': 'OCT', 'EKİM': 'OCT',
            'KAS': 'NOV', 'KASIM': 'NOV',
            'ARA': 'DEC', 'ARALIK': 'DEC'
        }
        
        for pattern in self.DATE_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Try to parse the date
                date_str = match.strip()
                
                # Convert Turkish months to English for parsing
                for turkish, english in turkish_months.items():
                    date_str = re.sub(rf'\b{turkish}\b', english, date_str, flags=re.IGNORECASE)
                
                # Common date formats to try
                formats = [
                    '%m/%d/%Y', '%m-%d-%Y', '%m.%d.%Y', '%m/%d/%y', '%m-%d-%y', '%m.%d.%y',
                    '%Y/%m/%d', '%Y-%m-%d', '%Y.%m.%d',
                    '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%d/%m/%y', '%d-%m-%y', '%d.%m.%y',
                    '%B %d, %Y', '%b %d, %Y', '%B %d %Y', '%b %d %Y',
                    '%d %B %Y', '%d %b %Y', '%d %B, %Y', '%d %b, %Y'
                ]
                
                for fmt in formats:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt).date()
                        # Sanity check: date should be within reasonable range
                        if date(2000, 1, 1) <= parsed_date <= date.today():
                            return parsed_date
                    except ValueError:
                        continue
        
        return None
    
    def extract_category(self, text: str, vendor: Optional[str] = None) -> Optional[str]:
        """Extract category based on vendor name and text content."""
        search_text = f"{text} {vendor or ''}".lower()
        
        # Score each category
        category_scores = {}
        
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword in search_text:
                    score += 1
            
            if score > 0:
                category_scores[category] = score
        
        # Return category with highest score
        if category_scores:
            return max(category_scores, key=category_scores.get)
        
        return None
    
    def extract_description(self, text: str, vendor: Optional[str] = None) -> str:
        """Generate description from vendor and text."""
        if vendor:
            return f"Purchase from {vendor}"
        
        # Use first line as description
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            return f"Receipt from {lines[0]}"
        
        return "Receipt"
    
    def calculate_confidence(
        self, 
        vendor: Optional[str], 
        amount: Optional[float], 
        date: Optional[date]
    ) -> float:
        """Calculate confidence score based on extracted data quality."""
        confidence = 0.0
        
        if vendor:
            confidence += 0.3
            if len(vendor) > 3 and len(vendor) < 30:
                confidence += 0.1
        
        if amount:
            confidence += 0.4
            if 0.01 <= amount <= 10000:  # Reasonable amount range
                confidence += 0.1
        
        if date:
            confidence += 0.2
            # Recent date gets bonus
            if (date.today() - date).days <= 30:
                confidence += 0.1
        
        return min(confidence, 1.0)

async def process_receipt_ocr(file_path: str) -> OCRResult:
    """
    Process receipt image/PDF with OCR and extract structured data.
    Enhanced with Turkish language support and item extraction.
    
    Args:
        file_path: Path to the receipt file
    
    Returns:
        OCRResult: Structured data extracted from the receipt
    """
    start_time = datetime.now()
    
    try:
        # Simulate OCR processing delay
        await asyncio.sleep(1)
        
        # Mock OCR text (in production, replace with actual OCR service)
        mock_ocr_text = generate_mock_ocr_text(file_path)
        
        # Parse the OCR text
        parser = ReceiptParser()
        vendor = parser.extract_vendor(mock_ocr_text)
        amount = parser.extract_amount(mock_ocr_text)
        extracted_date = parser.extract_date(mock_ocr_text)
        category = parser.extract_category(mock_ocr_text, vendor)
        description = parser.extract_description(mock_ocr_text, vendor)
        items = parser.extract_items(mock_ocr_text)  # NEW: Extract items
        confidence = parser.calculate_confidence(vendor, amount, extracted_date)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return OCRResult(
            vendor=vendor,
            amount=amount,
            date=extracted_date,
            description=description,
            category=category,
            items=items,  # NEW: Include items in result
            confidence=confidence,
            raw_text=mock_ocr_text,
            processing_time=processing_time
        )
        
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return OCRResult(
            confidence=0.0,
            raw_text=f"OCR processing failed: {str(e)}",
            processing_time=processing_time
        )

def generate_mock_ocr_text(file_path: str) -> str:
    """Generate mock OCR text for demonstration purposes with Turkish support."""
    
    # Different mock receipts based on filename
    filename = Path(file_path).name.lower()
    
    if 'turkish' in filename or 'tr' in filename:
        return """
        ÖZGÜR MARKET
        Bahçelievler Mah. 123. Sk No:45
        Ankara/TÜRKİYE
        Tel: 0312 456 78 90
        
        TARİH: 05.09.2025
        SAAT: 14:30
        FİŞ NO: ZA-2025-001234
        
        ÜRÜNLER:
        2 ADET Ekmek                 8,50 TL
        1 ADET Süt (1L)             12,90 TL
        3 ADET Yoğurt               15,75 TL
        1 ADET Peynir (500g)        45,00 TL
        2 ADET Domates (1kg)        18,60 TL
        
        ARA TOPLAM:                100,75 TL
        KDV (%18):                  18,14 TL
        GENEL TOPLAM:              118,89 TL
        
        ÖDEME: NAKİT
        
        Teşekkür ederiz!
        """
    elif 'office' in filename or 'supplies' in filename:
        return """
        OFFICE DEPOT
        Store #1234
        123 Main Street
        Anytown, CA 90210
        
        Date: 08/25/2025
        Time: 14:30:15
        
        PENS BIC BLUE 12PK       $8.99
        PAPER COPY 8.5X11        $12.99
        STAPLER SWINGLINE        $15.49
        FOLDERS MANILA 100CT     $9.99
        
        SUBTOTAL                 $47.46
        TAX                      $4.27
        TOTAL                    $51.73
        
        Thank you for shopping!
        """
    
    elif 'gas' in filename or 'fuel' in filename:
        return """
        CHEVRON
        Station #98765
        456 Highway Blvd
        
        08/24/2025  15:42
        
        UNLEADED REGULAR
        GALLONS: 12.450
        PRICE/GAL: $3.89
        
        FUEL TOTAL              $48.43
        
        PUMP #3
        """
    
    elif 'food' in filename or 'restaurant' in filename:
        return """
        OLIVE GARDEN
        1234 Restaurant Row
        Foodville, CA 92345
        
        Server: Sarah
        Table: 15
        Date: 08/23/2025 7:30 PM
        
        BREADSTICKS              $0.00
        CHICKEN PARMIGIANA      $18.99
        FETTUCCINE ALFREDO      $16.99
        TIRAMISU                 $7.99
        SOFT DRINKS (2)          $5.98
        
        SUBTOTAL                $49.95
        TAX                      $4.50
        TOTAL                   $54.45
        
        Thank You!
        """
    
    elif 'turkish_restaurant' in filename or 'lokanta' in filename:
        return """
        KÖŞE LOKANTASI
        Beşiktaş Mah. Dolmabahçe Cad. No:78
        İstanbul/TÜRKİYE
        Tel: 0212 345 67 89
        
        TARİH: 04.09.2025
        SAAT: 12:45
        MASA NO: 12
        GARSON: Mehmet
        
        SİPARİŞLER:
        2 PORSIYON Köfte         60,00 TL
        1 PORSIYON Pilav         15,00 TL
        1 ADET Ayran             8,00 TL
        1 ADET Çorba             12,00 TL
        1 ADET Baklava           25,00 TL
        
        ARA TOPLAM:             120,00 TL
        SERVİS ÜCRETİ:           12,00 TL
        TOPLAM:                 132,00 TL
        
        ÖDEME: KREDİ KARTI
        KART: **** **** **** 5678
        
        Afiyet olsun!
        """
    
    else:
        # Generic receipt
        return """
        ACME STORE
        987 Commerce St
        Business City, CA 90123
        
        Date: 08/22/2025
        Time: 11:15 AM
        Cashier: #123
        
        ITEM 1                  $12.99
        ITEM 2                  $8.50
        ITEM 3                  $15.99
        
        SUBTOTAL                $37.48
        TAX (8.75%)             $3.28
        TOTAL                   $40.76
        
        VISA ENDING IN 1234
        """

# Integration functions for production OCR services

async def process_with_tesseract(file_path: str) -> str:
    """Process image with Tesseract OCR (requires pytesseract)."""
    try:
        import pytesseract
        from PIL import Image
        
        # Open and process image
        image = Image.open(file_path)
        
        # OCR with custom config for receipts
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$:-'
        text = pytesseract.image_to_string(image, config=custom_config)
        
        return text
        
    except ImportError:
        raise Exception("Tesseract OCR not installed. Install with: pip install pytesseract")
    except Exception as e:
        raise Exception(f"Tesseract OCR failed: {str(e)}")

async def process_with_aws_textract(file_path: str) -> str:
    """Process image with AWS Textract."""
    try:
        import boto3
        
        textract = boto3.client('textract')
        
        # Read image file
        with open(file_path, 'rb') as document:
            image_bytes = document.read()
        
        # Call Textract
        response = textract.detect_document_text(
            Document={'Bytes': image_bytes}
        )
        
        # Extract text
        text = ''
        for item in response['Blocks']:
            if item['BlockType'] == 'LINE':
                text += item['Text'] + '\n'
        
        return text
        
    except ImportError:
        raise Exception("AWS SDK not installed. Install with: pip install boto3")
    except Exception as e:
        raise Exception(f"AWS Textract failed: {str(e)}")

async def process_with_google_vision(file_path: str) -> str:
    """Process image with Google Cloud Vision API."""
    try:
        from google.cloud import vision
        
        client = vision.ImageAnnotatorClient()
        
        # Read image file
        with open(file_path, 'rb') as image_file:
            content = image_file.read()
        
        image = vision.Image(content=content)
        
        # Perform text detection
        response = client.text_detection(image=image)
        texts = response.text_annotations
        
        if texts:
            return texts[0].description
        
        return ""
        
    except ImportError:
        raise Exception("Google Cloud Vision not installed. Install with: pip install google-cloud-vision")
    except Exception as e:
        raise Exception(f"Google Vision API failed: {str(e)}")

# Choose OCR provider based on configuration
OCR_PROVIDER = "mock"  # Options: "mock", "tesseract", "aws_textract", "google_vision"

async def get_ocr_text(file_path: str) -> str:
    """Get OCR text using configured provider."""
    if OCR_PROVIDER == "tesseract":
        return await process_with_tesseract(file_path)
    elif OCR_PROVIDER == "aws_textract":
        return await process_with_aws_textract(file_path)
    elif OCR_PROVIDER == "google_vision":
        return await process_with_google_vision(file_path)
    else:
        return generate_mock_ocr_text(file_path)
