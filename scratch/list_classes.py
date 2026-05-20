import zipfile
import re

jar_path = r"c:\Users\india\Desktop\projects\Exim-Export\scratch\nCodePkiComponentV4.jar"

with zipfile.ZipFile(jar_path, 'r') as z:
    for name in z.namelist():
        # Filter out common library packages to find the custom classes
        if not re.match(r'^(org|com/sun|javax|java|com/fasterxml|net/sf|ch/qos|com/google|com/thoughtworks|org/xmlpull|org/apache|org/eclipse|org/glassfish|weblogic|org/jdom|junit|org/hamcrest|org/yaml|org/jvnet|org/slf4j|jersey|jetty-dir|javassist)/', name):
            print(name)
