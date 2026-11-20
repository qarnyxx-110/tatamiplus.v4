from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.forms import ClearableFileInput
from django.utils.deconstruct import deconstructible


@deconstructible
class PrivateUploadStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(location=settings.PRIVATE_UPLOAD_ROOT)

    def url(self, name):
        raise ValueError('Private uploads do not have public URLs.')


class PrivateFileInput(ClearableFileInput):
    """File input for privately stored files.

    Django's ClearableFileInput links to `value.url` to show the current file,
    which `PrivateUploadStorage` refuses to provide. This widget shows the
    stored file name instead, with no link.
    """

    template_name = 'widgets/private_file_input.html'

    def is_initial(self, value):
        return bool(value and getattr(value, 'name', False))