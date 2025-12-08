"""
Management command to optimize static assets for better caching
"""
import os
import gzip
import shutil
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.staticfiles import finders
from django.contrib.staticfiles.management.commands.collectstatic import Command as CollectStaticCommand


class Command(BaseCommand):
    help = 'Optimize static assets for better caching and performance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--compress',
            action='store_true',
            help='Pre-compress static files with gzip',
        )
        parser.add_argument(
            '--analyze',
            action='store_true',
            help='Analyze static file sizes and suggest optimizations',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting static assets optimization...')
        )

        if options['analyze']:
            self.analyze_static_files()

        if options['compress']:
            self.compress_static_files()

        # Always run collectstatic with optimization
        self.optimize_collectstatic()

        self.stdout.write(
            self.style.SUCCESS('Static assets optimization completed!')
        )

    def analyze_static_files(self):
        """Analyze static files and provide optimization suggestions"""
        self.stdout.write('Analyzing static files...')
        
        total_size = 0
        file_types = {}
        large_files = []

        for finder in finders.get_finders():
            for path, storage in finder.list(['.']):
                if storage.exists(path):
                    try:
                        size = storage.size(path)
                        total_size += size
                        
                        # Track by file extension
                        ext = os.path.splitext(path)[1].lower()
                        if ext not in file_types:
                            file_types[ext] = {'count': 0, 'size': 0}
                        file_types[ext]['count'] += 1
                        file_types[ext]['size'] += size
                        
                        # Track large files (>100KB)
                        if size > 100 * 1024:
                            large_files.append((path, size))
                            
                    except (OSError, NotImplementedError):
                        continue

        # Display analysis
        self.stdout.write(f'\nTotal static files size: {self.format_size(total_size)}')
        
        self.stdout.write('\nFile types breakdown:')
        for ext, data in sorted(file_types.items(), key=lambda x: x[1]['size'], reverse=True):
            self.stdout.write(
                f'  {ext or "(no ext)"}: {data["count"]} files, {self.format_size(data["size"])}'
            )

        if large_files:
            self.stdout.write(f'\nLarge files (>100KB):')
            for path, size in sorted(large_files, key=lambda x: x[1], reverse=True):
                self.stdout.write(f'  {path}: {self.format_size(size)}')

        # Optimization suggestions
        self.stdout.write('\nOptimization suggestions:')
        
        js_size = file_types.get('.js', {}).get('size', 0)
        css_size = file_types.get('.css', {}).get('size', 0)
        
        if js_size > 500 * 1024:  # >500KB
            self.stdout.write('  - Consider minifying JavaScript files')
            
        if css_size > 200 * 1024:  # >200KB
            self.stdout.write('  - Consider minifying CSS files')
            
        image_exts = ['.jpg', '.jpeg', '.png', '.gif']
        image_size = sum(file_types.get(ext, {}).get('size', 0) for ext in image_exts)
        
        if image_size > 2 * 1024 * 1024:  # >2MB
            self.stdout.write('  - Consider optimizing images (WebP format, compression)')

    def compress_static_files(self):
        """Pre-compress static files with gzip"""
        self.stdout.write('Pre-compressing static files...')
        
        static_root = settings.STATIC_ROOT
        if not os.path.exists(static_root):
            self.stdout.write(
                self.style.WARNING('Static root does not exist. Run collectstatic first.')
            )
            return

        compressed_count = 0
        compressible_extensions = ['.css', '.js', '.html', '.txt', '.xml', '.json', '.svg']

        for root, dirs, files in os.walk(static_root):
            for filename in files:
                filepath = os.path.join(root, filename)
                
                # Skip already compressed files
                if filename.endswith('.gz'):
                    continue
                    
                # Check if file should be compressed
                if any(filename.endswith(ext) for ext in compressible_extensions):
                    gz_filepath = filepath + '.gz'
                    
                    # Only compress if .gz doesn't exist or source is newer
                    if (not os.path.exists(gz_filepath) or 
                        os.path.getmtime(filepath) > os.path.getmtime(gz_filepath)):
                        
                        with open(filepath, 'rb') as f_in:
                            with gzip.open(gz_filepath, 'wb') as f_out:
                                shutil.copyfileobj(f_in, f_out)
                        
                        compressed_count += 1

        self.stdout.write(f'Pre-compressed {compressed_count} files')

    def optimize_collectstatic(self):
        """Run collectstatic with optimization settings"""
        self.stdout.write('Running optimized collectstatic...')
        
        # Set environment variables for optimization
        os.environ['DJANGO_STATIC_OPTIMIZE'] = '1'
        
        # Run collectstatic
        collect_command = CollectStaticCommand()
        collect_command.handle(
            interactive=False,
            verbosity=1,
            clear=True,
            dry_run=False,
            ignore_patterns=[],
            use_default_ignore_patterns=True,
            link=False,  # Add missing link parameter
            post_process=True,  # Add missing post_process parameter
        )

    def format_size(self, size):
        """Format file size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
