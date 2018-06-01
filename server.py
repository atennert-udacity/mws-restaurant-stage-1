#!/usr/bin/env python3
# A demonstration that your browser opens many requests to a server.
# The base is taken from the Udacity Python server course part.

import http.server
from socketserver import ThreadingMixIn
import threading
import os
import posixpath
import urllib
import mimetypes
import zlib

# gzip the contents
# https://github.com/ksmith97/GzipSimpleHTTPServer/blob/master/GzipSimpleHTTPServer.py
def gzip_encode(content):
  gzip_compress = zlib.compressobj(9, zlib.DEFLATED, zlib.MAX_WBITS | 16)
  data = gzip_compress.compress(content) + gzip_compress.flush()
  return data

class GZipServer(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    content = self.send_head()
    if content:
      self.wfile.write(content)

  def send_head(self):
    """Common code for GET and HEAD commands.
    This sends the response code and MIME headers.
    Return value is either a file object (which has to be copied
    to the outputfile by the caller unless the command was HEAD,
    and must be closed by the caller under all circumstances), or
    None, in which case the caller has nothing further to do.
    """
    path = self.translate_path(self.path)
    print("Serving path '%s'" % path)
    f = None
    if os.path.isdir(path):
      if not self.path.endswith('/'):
        # redirect browser - doing basically what apache does
        self.send_response(301)
        self.send_header("Location", self.path + "/")
        self.end_headers()
        return None
      for index in "index.html", "index.htm":
        index = os.path.join(path, index)
        if os.path.exists(index):
          path = index
          break
    ctype = self.guess_type(path)
    try:
      # Always read in binary mode. Opening files in text mode may cause
      # newline translations, making the actual size of the content
      # transmitted *less* than the content-length!
      f = open(path, 'rb')
    except IOError:
      self.send_error(404, "File not found")
      return None
    self.send_response(200)
    self.send_header("Content-type", ctype)
    self.send_header("Content-Encoding", "gzip")
    fs = os.fstat(f.fileno())
    raw_content_length = fs[6]
    content = f.read()

    # Encode content based on runtime arg
    content = gzip_encode(content)

    compressed_content_length = len(content)
    f.close()
    self.send_header("Content-Length", max(raw_content_length, compressed_content_length))
    self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
    self.end_headers()
    return content

  def translate_path(self, path):
    """Translate a /-separated PATH to the local filename syntax.
    Components that mean special things to the local file system
    (e.g. drive or directory names) are ignored.  (XXX They should
    probably be diagnosed.)
    """
    # abandon query parameters
    path = path.split('?',1)[0]
    path = path.split('#',1)[0]
    path = posixpath.normpath(urllib.parse.unquote(path))
    words = path.split('/')
    words = filter(None, words)
    path = os.getcwd()
    for word in words:
      drive, word = os.path.splitdrive(word)
      head, word = os.path.split(word)
      if word in (os.curdir, os.pardir): continue
      path = os.path.join(path, word)
    return path

  def guess_type(self, path):
    """Guess the type of a file.
    Argument is a PATH (a filename).
    Return value is a string of the form type/subtype,
    usable for a MIME Content-type header.
    The default implementation looks the file's extension
    up in the table self.extensions_map, using application/octet-stream
    as a default; however it would be permissible (if
    slow) to look inside the data to make a better guess.
    """

    base, ext = posixpath.splitext(path)
    if ext in self.extensions_map:
      return self.extensions_map[ext]
    ext = ext.lower()
    if ext in self.extensions_map:
      return self.extensions_map[ext]
    else:
      return self.extensions_map['']

  if not mimetypes.inited:
    mimetypes.init() # try to read system mime.types
  extensions_map = mimetypes.types_map.copy()
  extensions_map.update({
      '': 'application/octet-stream', # Default
      })

class ThreadHTTPServer(ThreadingMixIn, http.server.HTTPServer):
  pass

if __name__ == "__main__":
  address = ("", 8000)
  httpd = ThreadHTTPServer(address, GZipServer)
  httpd.serve_forever()