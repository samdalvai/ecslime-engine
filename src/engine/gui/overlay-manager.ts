/**
 * Class that handles engine overlay
 */
export default class OverlayManager {
    private overlay: HTMLDivElement;
    private visible: boolean;

    constructor() {
        const overlay = document.getElementById('overlay') as HTMLDivElement;

        if (!overlay) {
            throw new Error('Could not locate overlay element');
        }

        this.overlay = overlay;
        this.visible = false;
    }

    showOverlay = () => {
        this.overlay.classList.remove('hidden');
        this.visible = true;
    };

    hideOverlay = () => {
        this.overlay.classList.add('hidden');
        this.visible = false;
    };

    isVisible = () => {
        return this.visible;
    };

    setText = (text: string) => {
        this.overlay.innerHTML = '';

        const textContainer = document.createElement('div');
        textContainer.style.fontSize = 'xx-large';
        textContainer.style.color = 'red';

        textContainer.innerText = text;

        this.overlay.appendChild(textContainer);
    };
}
