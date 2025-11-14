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
   - Will contain .po and .mo files for each language

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

This creates: `locale/et/LC_MESSAGES/django.po`

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
- The language persists in their session

## Notes

- Translation files are in: `locale/et/LC_MESSAGES/django.po`
- Always run `compilemessages` after editing .po files
- The language preference is stored in the user's session
- Static text in JavaScript may require additional setup (we'll handle that when needed)

