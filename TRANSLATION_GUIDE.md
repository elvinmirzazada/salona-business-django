# Translation Setup Guide

## Overview
This project now supports multiple languages: English (en) and Estonian (et).

## What's Been Set Up

1. **Django i18n Configuration**
   - `LocaleMiddleware` added to handle language detection and switching
   - Language settings configured in `settings.py`
   - Default language: English (en)
   - Available languages: English, Estonian

2. **Language Switcher Component**
   - Located at: `templates/partials/language_switcher.html`
   - Can be included in any template with: `{% include 'partials/language_switcher.html' %}`

3. **Translation Files Directory**
   - Location: `locale/` (at project root)
   - Contains .po and .mo files for each language

4. **Translated Pages**
   - ✅ Home page (index.html)
   - ✅ Login page
   - ✅ Signup page
   - ✅ Dashboard page (fully translated - all UI elements, forms, popups, and buttons)

## How to Add Translations to a Page

### Step 1: Mark Strings for Translation in Templates

In your HTML templates, load the i18n template tags at the top:
```django
{% load i18n %}
```

Then wrap text strings with the `trans` tag for simple strings:
```django
<h1>{% trans "Welcome to Salona" %}</h1>
<button>{% trans "Submit" %}</button>
```

For strings with variables or longer blocks, use `blocktrans`:
```django
{% blocktrans with name=user.name %}
    Hello, {{ name }}! Welcome back.
{% endblocktrans %}
```

### Step 2: Mark Strings in Python Code

In views.py or other Python files:
```python
from django.utils.translation import gettext as _

# Simple translation
message = _("Welcome to our platform")

# Translation with lazy evaluation (for module-level strings)
from django.utils.translation import gettext_lazy as _
error_message = _("This field is required")
```

### Step 3: Generate Translation Files

After marking strings, run this command to extract them:
```bash
python manage.py makemessages -l et
```

This creates/updates: `locale/et/LC_MESSAGES/django.po`

### Step 4: Translate the Strings

Open the generated `.po` file and add Estonian translations:
```
msgid "Welcome to Salona"
msgstr "Tere tulemast Salonasse"

msgid "Submit"
msgstr "Esita"
```

### Step 5: Compile Translations

After translating, compile the .po files:
```bash
python manage.py compilemessages
```

This creates `.mo` files that Django uses at runtime.

### Step 6: Add Language Switcher to Your Page

Include the language switcher component in your template:
```django
{% include 'partials/language_switcher.html' %}
```

You can add this to your navigation bar or any other suitable location.

## Dashboard Translations

The dashboard page has been fully translated with Estonian translations for:

### Main Interface
- Page title: "Dashboard" → "Juhtpaneel"
- Welcome message: "Welcome, [name]!" → "Tere tulemast, [name]!"
- Staff filter: "Filter by staff:" → "Filtreeri töötaja järgi:"
- "All Staff" → "Kõik töötajad"

### Booking Details Popup
- "Booking Details" → "Broneeringu üksikasjad"
- "Customer Information" → "Kliendi andmed"
- "Booked Services" → "Broneeritud teenused"
- "Notes:" → "Märkmed:"
- Action buttons: Confirm, Edit, Delete

### Booking Form
- "Add New Booking" → "Lisa uus broneering"
- Form steps: "Date & Service", "Staff & Customer"
- All form fields: Start Date, End Date, Start Time, End Time
- "Search Services:" → "Otsi teenuseid:"
- "Selected Services" → "Valitud teenused"
- "Total Duration:" → "Kogu kestus:"
- "Total Price:" → "Koguhind:"

### Time Off Management
- "Schedule Time Off" → "Planeeri puhkeaeg"
- "Time Off Details" → "Puhkeaja üksikasjad"
- "Staff Information" → "Töötaja andmed"
- "Reason:" → "Põhjus:"

### Confirmation Dialogs
- "Confirm Action" → "Kinnita tegevus"
- "Are you sure you want to delete this booking?" → "Kas oled kindel, et soovid selle broneeringu kustutada?"
- "Yes" → "Jah"
- "No" → "Ei"

## Example Workflow

When you're ready to translate a specific page:

1. Tell me which page/template you want to translate
2. I'll add the {% load i18n %} tag and wrap strings with {% trans %}
3. I'll run makemessages to generate the Estonian translation file
4. You provide the Estonian translations for each string
5. I'll update the .po file and compile the messages
6. The page will now support both languages!

## Language Switching

Users can switch languages using:
- The language switcher dropdown (automatically redirects to current page)
- Their browser's language preference (detected automatically)
- The language preference persists in their session

## Translation File Locations

- **Source file (editable)**: `locale/et/LC_MESSAGES/django.po`
- **Compiled file (auto-generated)**: `locale/et/LC_MESSAGES/django.mo`

Always run `compilemessages` after editing .po files!

## Notes

- Translation files are in: `locale/et/LC_MESSAGES/django.po`
- Always run `compilemessages` after editing .po files
- The language preference is stored in the user's session
- Static text in JavaScript may require additional setup (we'll handle that when needed)
- The .mo file (12KB) has been successfully compiled and is ready for use
