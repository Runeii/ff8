const FPS = 30;

class LerpValue {
  private currentValue: number;
  private targetValue: number;
  private startValue: number;
  private duration: number;
  private startTime: number;
  private animationId: number | null = null;
  public isAnimating: boolean = false;
  private isLooping: boolean = false;

  private speedMultiplier: number = 1.0;

  constructor(initialValue: number = 0, speedMultiplier: number = 1.0) {
    this.currentValue = initialValue;
    this.targetValue = initialValue;
    this.startValue = initialValue;
    this.duration = 0;
    this.startTime = 0;
    this.speedMultiplier = speedMultiplier; 
  }

  calculateDuration(speed: number): number {
    return speed / FPS * 1000 * this.speedMultiplier;
  }

  start(targetValue: number, duration: number, delay: number = 0, isLooping: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      // Cancel any existing animation
      this.stop();

      this.startValue = this.currentValue;
      this.targetValue = targetValue;
      this.duration = duration;
      this.isAnimating = true;
      this.isLooping = isLooping;

      const startAnimation = () => {
        // Handle immediate completion for 0 duration
        if (this.duration <= 0) {
          this.currentValue = this.targetValue;
          this.isAnimating = false;
          
          if (this.isLooping) {
            // For looping with 0 duration, immediately restart
            this.start(this.targetValue, this.duration, 0, true);
          }
          resolve();
          return;
        }

        this.startTime = performance.now();

        const animate = (currentTime: number) => {
          const elapsed = currentTime - this.startTime;
          const progress = Math.min(elapsed / this.duration, 1);
          
          // Linear interpolation
          this.currentValue = this.startValue + (this.targetValue - this.startValue) * progress;

          if (progress < 1) {
            this.animationId = requestAnimationFrame(animate);
          } else {
            this.currentValue = this.targetValue;
            
            if (this.isLooping) {
              // Restart the animation
              const temp = this.startValue;
              this.startValue = this.targetValue;
              this.targetValue = temp;
              this.startTime = performance.now();
              this.animationId = requestAnimationFrame(animate);
            } else {
              this.isAnimating = false;
              this.animationId = null;
              resolve();
            }
          }
        };

        this.animationId = requestAnimationFrame(animate);
      };

      if (delay > 0) {
        setTimeout(startAnimation, delay);
      } else {
        startAnimation();
      }
    });
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.isAnimating = false;
    }
  }

  get(): number {
    return this.currentValue;
  }

  set(value: number): void {
    this.stop();
    this.currentValue = value;
    this.targetValue = value;
    this.startValue = value;
  }
}

export default LerpValue;