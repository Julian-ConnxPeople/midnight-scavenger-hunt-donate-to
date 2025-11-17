// Load YAML configuration file
export function loadFile(path) {
    try {
        const contents = fs.readFileSync(path, 'utf8');
        return yaml.load(contents);
    } catch (e) {
        throw new Error(`Unable to load yaml from ${path}: ${e.message}`);
    }
}